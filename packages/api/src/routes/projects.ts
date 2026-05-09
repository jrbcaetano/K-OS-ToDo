/**
 * Projects: workspace-scoped CRUD with archive lifecycle.
 *
 * Per docs/schema.md and ADR 0003. Archive is structured: a reason from
 * ARCHIVE_REASONS, an optional note, and stamped `archived_by`. Tasks
 * under archived projects are kept (Q4) — this route just hides the
 * project from the active list; downstream task views filter via the
 * `active_tasks` view that lands in Block 6.
 *
 * Project ↔ Person link is a separate /:id/people sub-resource:
 *   GET    /:id/people      — list links
 *   POST   /:id/people      — link a person (with optional role)
 *   DELETE /:id/people/:pid — unlink
 */

import { Hono } from 'hono';
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
  projects,
  projectPeople,
  people as peopleTable,
  getDb,
} from '@k-os/db';
import { ARCHIVE_REASONS, PROJECT_STATUSES } from '@k-os/core';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { stripUndefined } from './_helpers';

const app = new Hono<{ Variables: AuthVariables }>();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  outcome: z.string().min(1).max(500),
  status: z.enum(PROJECT_STATUSES).optional(),
  contextId: z.string().uuid().nullable().optional(),
  targetDate: z.string().date().nullable().optional(), // YYYY-MM-DD
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  outcome: z.string().min(1).max(500).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  contextId: z.string().uuid().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
});

const archiveSchema = z.object({
  reason: z.enum(ARCHIVE_REASONS),
  note: z.string().max(500).nullable().optional(),
});

app.get('/', async (c) => {
  const archived = c.req.query('archived') === 'true';
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt),
      ),
    )
    .orderBy(asc(projects.name));
  return c.json({ projects: rows });
});

app.get('/:id', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ project: row });
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
  const d = parsed.data;
  const [row] = await db
    .insert(projects)
    .values({
      workspaceId,
      name: d.name.trim(),
      outcome: d.outcome.trim(),
      status: d.status ?? 'on_track',
      contextId: d.contextId ?? null,
      targetDate: d.targetDate ?? null,
      createdBy: user.id,
    })
    .returning();
  return c.json({ project: row }, 201);
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
    .update(projects)
    .set(patch)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.workspaceId, workspaceId)))
    .returning();
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ project: row });
});

app.post('/:id/archive', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = archiveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const [row] = await db
    .update(projects)
    .set({
      archivedAt: new Date(),
      archiveReason: parsed.data.reason,
      archiveNote: parsed.data.note ?? null,
      archivedBy: user.id,
    })
    .where(
      and(
        eq(projects.id, c.req.param('id')),
        eq(projects.workspaceId, workspaceId),
        isNull(projects.archivedAt),
      ),
    )
    .returning();
  if (!row) return c.json({ error: 'not_found_or_already_archived' }, 404);
  return c.json({ project: row });
});

app.post('/:id/restore', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .update(projects)
    .set({ archivedAt: null, archiveReason: null, archiveNote: null, archivedBy: null })
    .where(
      and(
        eq(projects.id, c.req.param('id')),
        eq(projects.workspaceId, workspaceId),
        isNotNull(projects.archivedAt),
      ),
    )
    .returning();
  if (!row) return c.json({ error: 'not_found_or_not_archived' }, 404);
  return c.json({ project: row });
});

// ---------------------------------------------------------------------------
// Project ↔ People junction
// ---------------------------------------------------------------------------

const linkSchema = z.object({
  personId: z.string().uuid(),
  role: z.string().max(80).nullable().optional(),
});

async function ensureProjectInWorkspace(workspaceId: string, projectId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  return !!row;
}

app.get('/:id/people', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const projectId = c.req.param('id');
  if (!(await ensureProjectInWorkspace(workspaceId, projectId))) {
    return c.json({ error: 'not_found' }, 404);
  }
  const db = getDb();
  const rows = await db
    .select({
      personId: projectPeople.personId,
      role: projectPeople.role,
      name: peopleTable.name,
      initials: peopleTable.initials,
      color: peopleTable.color,
    })
    .from(projectPeople)
    .innerJoin(peopleTable, eq(peopleTable.id, projectPeople.personId))
    .where(eq(projectPeople.projectId, projectId));
  return c.json({ people: rows });
});

app.post('/:id/people', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const projectId = c.req.param('id');
  if (!(await ensureProjectInWorkspace(workspaceId, projectId))) {
    return c.json({ error: 'not_found' }, 404);
  }
  const db = getDb();
  // Verify the person also belongs to this workspace.
  const [pers] = await db
    .select({ id: peopleTable.id })
    .from(peopleTable)
    .where(
      and(eq(peopleTable.id, parsed.data.personId), eq(peopleTable.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!pers) return c.json({ error: 'person_not_found' }, 404);

  await db
    .insert(projectPeople)
    .values({
      projectId,
      personId: parsed.data.personId,
      role: parsed.data.role ?? null,
    })
    .onConflictDoUpdate({
      target: [projectPeople.projectId, projectPeople.personId],
      set: { role: parsed.data.role ?? null },
    });
  return c.json({ ok: true }, 201);
});

app.delete('/:id/people/:personId', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const projectId = c.req.param('id');
  if (!(await ensureProjectInWorkspace(workspaceId, projectId))) {
    return c.json({ error: 'not_found' }, 404);
  }
  const db = getDb();
  await db
    .delete(projectPeople)
    .where(
      and(
        eq(projectPeople.projectId, projectId),
        eq(projectPeople.personId, c.req.param('personId')),
      ),
    );
  return c.json({ ok: true });
});

export default app;
