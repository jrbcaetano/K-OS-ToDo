/**
 * Admin endpoints.
 *
 *   - POST /materialise-recurring — workspace-scoped job trigger (existing).
 *   - GET  /approvals — platform-admin-only: list users still in `pending`.
 *   - POST /approvals/:userId/approve — flip a pending user to `approved`.
 *   - POST /approvals/:userId/reject  — soft-delete via `rejected` status.
 *
 * The approval routes are platform-wide (not workspace-scoped) so they sit
 * behind `requirePlatformAdmin` rather than the workspace gate.
 */

import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, users } from '@k-os/db';
import {
  actorUserId,
  requirePlatformAdmin,
  type Actor,
  type AuthVariables,
} from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { materialiseRecurring } from '../jobs/materialise-recurring';

const app = new Hono<{ Variables: AuthVariables }>();

app.post('/materialise-recurring', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const result = await materialiseRecurring(db, { workspaceId });
  return c.json(result);
});

// ── Registration approval queue ─────────────────────────────────────────────

app.get('/approvals', requirePlatformAdmin, async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.approvalStatus, 'pending'))
    .orderBy(asc(users.createdAt));
  return c.json({ approvals: rows });
});

app.post('/approvals/:userId/approve', requirePlatformAdmin, async (c) => {
  const db = getDb();
  const userId = c.req.param('userId');
  const actor: Actor = c.get('actor');
  const approverId = actorUserId(actor);

  const [updated] = await db
    .update(users)
    .set({
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: approverId,
      rejectedAt: null,
      rejectedBy: null,
    })
    .where(and(eq(users.id, userId), eq(users.approvalStatus, 'pending')))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      approvalStatus: users.approvalStatus,
    });
  if (!updated) return c.json({ error: 'not_found_or_not_pending' }, 404);
  return c.json({ user: updated });
});

app.post('/approvals/:userId/reject', requirePlatformAdmin, async (c) => {
  const db = getDb();
  const userId = c.req.param('userId');
  const actor: Actor = c.get('actor');
  const approverId = actorUserId(actor);

  const [updated] = await db
    .update(users)
    .set({
      approvalStatus: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: approverId,
      approvedAt: null,
      approvedBy: null,
    })
    .where(and(eq(users.id, userId), eq(users.approvalStatus, 'pending')))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      approvalStatus: users.approvalStatus,
    });
  if (!updated) return c.json({ error: 'not_found_or_not_pending' }, 404);
  return c.json({ user: updated });
});

export default app;
