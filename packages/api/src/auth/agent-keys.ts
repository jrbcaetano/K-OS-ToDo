/**
 * Agent API keys per [[0020 - agent-native-architecture-agents-external-to-platform]].
 *
 * Issuance: 32 random bytes hex-encoded with a `kos_` prefix so a leaked
 * key is grep-able. Hashed (SHA-256) at rest. Returned to the operator
 * exactly once; never logged or persisted in plaintext.
 *
 * Validation: hash the bearer token, lookup, check `revoked_at IS NULL`.
 * On hit, stamp `last_used_at` for observability (best-effort; we don't
 * await the write inside the hot path of every request).
 */

import { randomBytes, createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { agentKeys, type Db } from '@k-os/db';

export const AGENT_KEY_PREFIX = 'kos_';

export interface AgentKeyRecord {
  id: string;
  workspaceId: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface IssuedAgentKey {
  /** Raw token to hand to the operator. Send once, never log. */
  rawKey: string;
  record: AgentKeyRecord;
}

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateRawKey(): string {
  return AGENT_KEY_PREFIX + randomBytes(32).toString('hex');
}

export async function issueAgentKey(
  db: Db,
  input: { workspaceId: string; label: string; createdBy: string },
): Promise<IssuedAgentKey> {
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);

  const [row] = await db
    .insert(agentKeys)
    .values({
      workspaceId: input.workspaceId,
      keyHash,
      label: input.label.trim(),
      createdBy: input.createdBy,
    })
    .returning();

  return {
    rawKey,
    record: {
      id: row.id,
      workspaceId: row.workspaceId,
      label: row.label,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
    },
  };
}

export interface ValidatedAgentKey {
  keyId: string;
  workspaceId: string;
  label: string;
  /** The user who issued this key — used as the human-on-record for
   *  user FKs (created_by, owner_id) when an agent creates entities. */
  issuedByUserId: string;
}

/**
 * Look up an agent key by its raw bearer token. Returns the matched record
 * or null. Stamps `last_used_at` as a side-effect on hit.
 */
export async function validateAgentKey(
  db: Db,
  rawKey: string,
): Promise<ValidatedAgentKey | null> {
  if (!rawKey.startsWith(AGENT_KEY_PREFIX)) return null;
  const keyHash = hashKey(rawKey);

  const [row] = await db
    .select({
      id: agentKeys.id,
      workspaceId: agentKeys.workspaceId,
      label: agentKeys.label,
      createdBy: agentKeys.createdBy,
    })
    .from(agentKeys)
    .where(and(eq(agentKeys.keyHash, keyHash), isNull(agentKeys.revokedAt)))
    .limit(1);

  if (!row) return null;

  await db
    .update(agentKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentKeys.id, row.id));

  return {
    keyId: row.id,
    workspaceId: row.workspaceId,
    label: row.label,
    issuedByUserId: row.createdBy,
  };
}

export async function revokeAgentKey(db: Db, id: string, workspaceId: string): Promise<boolean> {
  const updated = await db
    .update(agentKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(agentKeys.id, id),
        eq(agentKeys.workspaceId, workspaceId),
        isNull(agentKeys.revokedAt),
      ),
    )
    .returning({ id: agentKeys.id });
  return updated.length > 0;
}

export async function listAgentKeys(
  db: Db,
  workspaceId: string,
): Promise<AgentKeyRecord[]> {
  const rows = await db
    .select({
      id: agentKeys.id,
      workspaceId: agentKeys.workspaceId,
      label: agentKeys.label,
      createdAt: agentKeys.createdAt,
      lastUsedAt: agentKeys.lastUsedAt,
    })
    .from(agentKeys)
    .where(and(eq(agentKeys.workspaceId, workspaceId), isNull(agentKeys.revokedAt)));
  return rows;
}
