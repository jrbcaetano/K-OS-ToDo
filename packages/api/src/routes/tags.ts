/**
 * Tags: workspace-scoped CRUD.
 *
 * Per [[0003]]: workspace-scoped, unique on `(workspace_id, name)`. Tags are
 * free-form labels; no slug, no color, no sort_order.
 */

import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { tags, getDb } from '@k-os/db';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';

const app = new Hono<{ Variables: AuthVariables }>();

const createSchema = z.object({
  name: z.string().min(1).max(40),
});
const patchSchema = z.object({
  name: z.string().min(1).max(40),
});

function normalizeName(name: string): string {
  return name.trim();
}

app.get('/', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const rows = await db
    .select()
    .from(tags)
    .where(eq(tags.workspaceId, workspaceId))
    .orderBy(asc(tags.name));
  return c.json({ tags: rows });
});

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const [row] = await db
    .insert(tags)
    .values({ workspaceId, name: normalizeName(parsed.data.name) })
    .onConflictDoNothing({ target: [tags.workspaceId, tags.name] })
    .returning();

  if (!row) return c.json({ error: 'name_in_use' }, 409);
  return c.json({ tag: row }, 201);
});

app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const [row] = await db
    .update(tags)
    .set({ name: normalizeName(parsed.data.name) })
    .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)))
    .returning();

  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ tag: row });
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const deleted = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)))
    .returning({ id: tags.id });

  if (deleted.length === 0) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

export default app;
