/**
 * Admin endpoints — operations the user (or a cron) can trigger manually.
 *
 * Currently:
 *   - POST /materialise-recurring — runs `materialiseRecurring` for the
 *     caller's workspace. Useful for debugging the job and as the target
 *     of a Vercel cron that fans out per workspace (Block 18).
 *
 * Mounted under the auth-required prefix; only authenticated workspace
 * members can trigger it. A future "system actor" cron path will sign
 * with a separate header — out of scope for this block.
 */

import { Hono } from 'hono';
import { getDb } from '@k-os/db';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { materialiseRecurring } from '../jobs/materialise-recurring';

const app = new Hono<{ Variables: AuthVariables }>();

app.post('/materialise-recurring', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const result = await materialiseRecurring(db, { workspaceId });
  return c.json(result);
});

export default app;
