/**
 * Agent API key management.
 *
 * Per [[0020 - agent-native-architecture-agents-external-to-platform]]:
 * agents authenticate against the platform's public API with a workspace-
 * scoped key. Only humans (cookie auth) can issue or revoke keys — an
 * agent cannot bootstrap or escalate its own access.
 *
 *   GET    /        — list active keys in the workspace (label + dates only).
 *   POST   /        — issue a new key. Returns the raw token EXACTLY ONCE.
 *   DELETE /:id     — revoke a key (sets revoked_at; idempotent).
 */

import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { getDb } from '@k-os/db';
import { actorUserId, type AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import {
  issueAgentKey,
  listAgentKeys,
  revokeAgentKey,
} from '../auth/agent-keys';

const app = new Hono<{ Variables: AuthVariables }>();

const createSchema = z.object({
  label: z.string().min(1).max(80),
});

function isUserActor(c: Context<{ Variables: AuthVariables }>): boolean {
  return c.get('actor').kind === 'user';
}

app.get('/', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const keys = await listAgentKeys(db, workspaceId);
  return c.json({ keys });
});

app.post('/', async (c) => {
  if (!isUserActor(c)) {
    return c.json({ error: 'agents_cannot_issue_keys' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const userId = actorUserId(c.get('actor'));
  const db = getDb();
  const issued = await issueAgentKey(db, {
    workspaceId,
    label: parsed.data.label,
    createdBy: userId,
  });

  return c.json(
    {
      // Raw key — sent to the operator EXACTLY ONCE. Never returned again.
      key: issued.rawKey,
      record: issued.record,
    },
    201,
  );
});

app.delete('/:id', async (c) => {
  if (!isUserActor(c)) {
    return c.json({ error: 'agents_cannot_revoke_keys' }, 403);
  }
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const ok = await revokeAgentKey(db, c.req.param('id'), workspaceId);
  if (!ok) return c.json({ error: 'not_found_or_already_revoked' }, 404);
  return c.json({ ok: true });
});

export default app;
