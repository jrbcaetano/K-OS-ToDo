/**
 * Cron-triggered routes.
 *
 * Vercel Cron hits these on a schedule and authenticates with the
 * `Authorization: Bearer <CRON_SECRET>` header. Not user-facing; not
 * agent-callable. Secret comes from `process.env.CRON_SECRET`.
 *
 *   POST /materialise-recurring — fans out across all workspaces and
 *     calls `materialiseRecurring` for each. Idempotent.
 */

import { Hono } from 'hono';
import { workspaces, getDb } from '@k-os/db';
import { materialiseRecurring } from '../jobs/materialise-recurring';

const app = new Hono();

function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}

app.post('/materialise-recurring', async (c) => {
  const expected = process.env.CRON_SECRET;
  const provided = c.req.header('authorization');
  if (!expected || !provided || provided !== `Bearer ${expected}`) {
    return unauthorized();
  }

  const db = getDb();
  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);

  let totalCreated = 0;
  let totalScanned = 0;
  for (const ws of allWorkspaces) {
    const result = await materialiseRecurring(db, { workspaceId: ws.id });
    totalCreated += result.instancesCreated;
    totalScanned += result.templatesScanned;
  }

  return c.json({
    workspaces: allWorkspaces.length,
    templatesScanned: totalScanned,
    instancesCreated: totalCreated,
  });
});

export default app;
