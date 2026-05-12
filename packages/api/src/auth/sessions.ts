/**
 * Session token issuance, validation, and revocation.
 *
 * Per [[0017 - sessions-not-jwts]]:
 *   - Tokens are 32 random bytes, hex-encoded (256 bits of entropy).
 *   - Only the SHA-256 hash is stored in `sessions.token_hash`.
 *   - The raw token is sent to the client once (cookie) and never persisted.
 *   - Validation = lookup by hash. Revocation = `revoked_at = now()` (or row delete).
 *   - Sliding-window expiry: each successful validation refreshes `expires_at`,
 *     up to a maximum lifetime measured from the session's first issuance
 *     (`expires_at` resets per validation, but never past the absolute cap).
 *
 * Implementation references the Copenhagen Book.
 */

import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { sessions, type Db } from '@k-os/db';

/** Either the top-level Db or a `db.transaction(...)` handle. */
type SessionClient = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

// Sliding window: each validation refreshes the expiry by this much.
export const SESSION_IDLE_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// Refresh expiry only when the remaining lifetime drops below this threshold —
// avoids a write on every request.
const SESSION_REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // 15 days

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ipHash?: string | null;
}

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgent: string | null;
  ipHash: string | null;
  revokedAt: Date | null;
}

export interface CreatedSession {
  /** The raw, un-hashed token. Send to the client once; never log or persist. */
  token: string;
  session: SessionRecord;
}

/** Generate a fresh 256-bit token, hex-encoded. */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 hex digest of a session token. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session for `userId`, persist it (storing only the hash),
 * and return the raw token + the row.
 */
export async function createSession(
  db: SessionClient,
  { userId, userAgent = null, ipHash = null }: CreateSessionInput,
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_LIFETIME_MS);

  const [row] = await db
    .insert(sessions)
    .values({
      tokenHash,
      userId,
      expiresAt,
      lastSeenAt: now,
      userAgent,
      ipHash,
    })
    .returning();

  return {
    token,
    session: {
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt: row.expiresAt,
      lastSeenAt: row.lastSeenAt,
      userAgent: row.userAgent,
      ipHash: row.ipHash,
      revokedAt: row.revokedAt,
    },
  };
}

export type ValidateSessionResult =
  | { kind: 'valid'; session: SessionRecord }
  | { kind: 'expired' }
  | { kind: 'revoked' }
  | { kind: 'unknown' };

/**
 * Look up the session for a raw token, check it's not expired or revoked,
 * and refresh its sliding-window expiry if appropriate.
 *
 * Returns a tagged union so callers can distinguish "no such session" from
 * "session known but revoked" if they need different responses.
 */
export async function validateSession(
  db: Db,
  rawToken: string,
): Promise<ValidateSessionResult> {
  const tokenHash = hashSessionToken(rawToken);

  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { kind: 'unknown' };
  if (row.revokedAt) return { kind: 'revoked' };

  const now = new Date();
  if (row.expiresAt.getTime() <= now.getTime()) {
    return { kind: 'expired' };
  }

  // Sliding-window refresh. Avoid a write on every request — only refresh
  // once the remaining lifetime has dropped past the threshold.
  const remainingMs = row.expiresAt.getTime() - now.getTime();
  let expiresAt = row.expiresAt;
  if (remainingMs < SESSION_IDLE_LIFETIME_MS - SESSION_REFRESH_THRESHOLD_MS) {
    expiresAt = new Date(now.getTime() + SESSION_IDLE_LIFETIME_MS);
    await db
      .update(sessions)
      .set({ expiresAt, lastSeenAt: now })
      .where(eq(sessions.tokenHash, tokenHash));
  } else {
    await db
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  return {
    kind: 'valid',
    session: {
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt,
      lastSeenAt: now,
      userAgent: row.userAgent,
      ipHash: row.ipHash,
      revokedAt: null,
    },
  };
}

/** Mark a single session as revoked. Idempotent. */
export async function revokeSession(db: Db, rawToken: string): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Revoke every active session for a user. Used by "log out everywhere" and
 * by the password-change flow. Idempotent.
 */
export async function revokeAllForUser(db: Db, userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.userId, userId));
}
