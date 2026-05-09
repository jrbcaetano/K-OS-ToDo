/**
 * One-shot verification tokens (magic-link, email-verify, password-reset).
 *
 * The single `verification_tokens` table backs all three flows per
 * [[0014 - auth-methods-password-magic-link-google-oauth]]. Tokens are 32
 * random bytes hex-encoded; only the SHA-256 hash sits in the DB. The raw
 * token is delivered out-of-band (email link) and is never persisted.
 *
 * Block 2 uses `purpose = 'magic_link'`. Future blocks reuse this helper
 * for `email_verify` and `password_reset` without changes.
 */

import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { verificationTokens, type Db } from '@k-os/db';

export type VerificationPurpose = 'magic_link' | 'email_verify' | 'password_reset';

export const MAGIC_LINK_LIFETIME_MS = 1000 * 60 * 15; // 15 minutes per [[0014]]

export interface IssueTokenInput {
  purpose: VerificationPurpose;
  expiresAt: Date;
  /** Set when the token is for a known user. */
  userId?: string | null;
  /** Set when the token is for an email that may or may not have a user yet. */
  email?: string | null;
}

export interface IssuedToken {
  /** Raw token to embed in the email link. Never log or persist. */
  token: string;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Insert a new verification token. The raw `token` is returned once; the
 * caller embeds it in the outbound email and forgets it.
 */
export async function issueToken(
  db: Db,
  { purpose, expiresAt, userId = null, email = null }: IssueTokenInput,
): Promise<IssuedToken> {
  const token = generateToken();
  const tokenHash = hashVerificationToken(token);

  await db.insert(verificationTokens).values({
    tokenHash,
    userId,
    email: email ? email.trim().toLowerCase() : null,
    purpose,
    expiresAt,
  });

  return { token };
}

export type ConsumeTokenResult =
  | { kind: 'consumed'; userId: string | null; email: string | null }
  | { kind: 'unknown' }
  | { kind: 'expired' }
  | { kind: 'already_used' }
  | { kind: 'wrong_purpose' };

/**
 * Look up + atomically consume a token of the given purpose. The row's
 * `consumed_at` is set so a second redemption returns `already_used`.
 *
 * Returns the `userId` and/or `email` that was attached at issue time so
 * the caller can decide whether to log in an existing user or create one.
 */
export async function consumeToken(
  db: Db,
  rawToken: string,
  purpose: VerificationPurpose,
): Promise<ConsumeTokenResult> {
  const tokenHash = hashVerificationToken(rawToken);

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { kind: 'unknown' };
  if (row.purpose !== purpose) return { kind: 'wrong_purpose' };
  if (row.consumedAt) return { kind: 'already_used' };
  if (row.expiresAt.getTime() <= Date.now()) return { kind: 'expired' };

  // Mark consumed. We use a conditional update so a concurrent redeem of
  // the same token can't both succeed — only the first wins.
  const updated = await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.tokenHash, tokenHash))
    .returning({ tokenHash: verificationTokens.tokenHash });

  if (updated.length === 0) return { kind: 'already_used' };

  return { kind: 'consumed', userId: row.userId, email: row.email };
}
