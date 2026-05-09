/**
 * Contexts: workspace-scoped CRUD + reorder.
 *
 * Per [[0003 - workspace-scoped-schema-for-multi-user-readiness]] every query
 * scopes by `workspace_id` from the auth middleware. The contexts table FKs
 * (tasks/projects/areas/people) all `ON DELETE SET NULL` per the schema doc,
 * so deleting a context never breaks anything — the references just unlink.
 */

import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { contexts, getDb } from '@k-os/db';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { stripUndefined } from './_helpers';

const app = new Hono<{ Variables: AuthVariables }>();

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const createSchema = z.object({
  slug: z.string().regex(SLUG_RE, 'invalid_slug'),
  label: z.string().min(1).max(40),
  color: z.string().regex(HEX_COLOR_RE, 'invalid_color'),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const patchSchema = z.object({
  slug: z.string().regex(SLUG_RE).optional(),
  label: z.string().min(1).max(40).optional(),
  color: z.string().regex(HEX_COLOR_RE).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const reorderSchema = z.object({
  order: z
    .array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0).max(9999) }))
    .min(1)
    .max(200),
});

app.get('/', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const rows = await db
    .select()
    .from(contexts)
    .where(eq(contexts.workspaceId, workspaceId))
    .orderBy(asc(contexts.sortOrder), asc(contexts.label));
  return c.json({ contexts: rows });
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
    .insert(contexts)
    .values({
      workspaceId,
      slug: parsed.data.slug,
      label: parsed.data.label,
      color: parsed.data.color,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .onConflictDoNothing({ target: [contexts.workspaceId, contexts.slug] })
    .returning();

  if (!row) return c.json({ error: 'slug_in_use' }, 409);
  return c.json({ context: row }, 201);
});

app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const patch = stripUndefined(parsed.data);
  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'empty_patch' }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const [row] = await db
    .update(contexts)
    .set(patch)
    .where(and(eq(contexts.id, id), eq(contexts.workspaceId, workspaceId)))
    .returning();

  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ context: row });
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const deleted = await db
    .delete(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.workspaceId, workspaceId)))
    .returning({ id: contexts.id });

  if (deleted.length === 0) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

app.post('/reorder', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  await db.transaction(async (tx) => {
    for (const { id, sortOrder } of parsed.data.order) {
      await tx
        .update(contexts)
        .set({ sortOrder })
        .where(and(eq(contexts.id, id), eq(contexts.workspaceId, workspaceId)));
    }
  });

  return c.json({ ok: true });
});

export default app;
