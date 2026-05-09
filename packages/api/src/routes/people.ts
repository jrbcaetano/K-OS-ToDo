/**
 * People: workspace-scoped CRUD with archive lifecycle.
 *
 * Per docs/schema.md and ADR 0003. People archive via `archived_at`
 * (no reason/note — that's projects/areas only). Soft-delete: archived
 * rows stay queryable so historical references don't break.
 */

import { Hono } from 'hono';
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { people, getDb } from '@k-os/db';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { stripUndefined } from './_helpers';

const app = new Hono<{ Variables: AuthVariables }>();

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const createSchema = z.object({
  name: z.string().min(1).max(80),
  initials: z.string().min(1).max(4),
  color: z.string().regex(HEX_COLOR_RE),
  contextId: z.string().uuid().nullable().optional(),
  role: z.string().max(120).nullable().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  initials: z.string().min(1).max(4).optional(),
  color: z.string().regex(HEX_COLOR_RE).optional(),
  contextId: z.string().uuid().nullable().optional(),
  role: z.string().max(120).nullable().optional(),
});

app.get('/', async (c) => {
  const archived = c.req.query('archived') === 'true';
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const rows = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.workspaceId, workspaceId),
        archived ? isNotNull(people.archivedAt) : isNull(people.archivedAt),
      ),
    )
    .orderBy(asc(people.name));
  return c.json({ people: rows });
});

app.get('/:id', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, c.req.param('id')), eq(people.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ person: row });
});

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const data = parsed.data;

  const [row] = await db
    .insert(people)
    .values({
      workspaceId,
      name: data.name.trim(),
      initials: data.initials.trim().toUpperCase(),
      color: data.color,
      contextId: data.contextId ?? null,
      role: data.role ?? null,
      createdBy: user.id,
    })
    .returning();
  return c.json({ person: row }, 201);
});

app.patch('/:id', async (c) => {
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
    .update(people)
    .set(patch)
    .where(and(eq(people.id, c.req.param('id')), eq(people.workspaceId, workspaceId)))
    .returning();
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ person: row });
});

app.post('/:id/archive', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .update(people)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(people.id, c.req.param('id')),
        eq(people.workspaceId, workspaceId),
        isNull(people.archivedAt),
      ),
    )
    .returning();
  if (!row) return c.json({ error: 'not_found_or_already_archived' }, 404);
  return c.json({ person: row });
});

app.post('/:id/restore', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .update(people)
    .set({ archivedAt: null })
    .where(
      and(
        eq(people.id, c.req.param('id')),
        eq(people.workspaceId, workspaceId),
        isNotNull(people.archivedAt),
      ),
    )
    .returning();
  if (!row) return c.json({ error: 'not_found_or_not_archived' }, 404);
  return c.json({ person: row });
});

export default app;
