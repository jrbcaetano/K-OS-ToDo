/**
 * Areas: workspace-scoped CRUD with archive lifecycle and review action.
 *
 * Per docs/schema.md and ADR 0003. Areas mirror projects on the archive
 * lifecycle (reason / note / archived_by) but add `cadence` (free-form
 * "Reviewed weekly") plus `last_reviewed_at` / `next_review_at`.
 *
 * The `/review` action stamps `last_reviewed_at = now()` and bumps
 * `next_review_at`. Because cadence is free-form text, the caller can
 * pass an explicit `nextReviewAt` (ISO date-time); if absent we default
 * to +7 days. Block 14 (Areas detail UI) will surface a structured
 * picker that always sends an explicit value.
 */

import { Hono } from 'hono';
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
  areas,
  areaPeople,
  people as peopleTable,
  getDb,
} from '@k-os/db';
import { ARCHIVE_REASONS } from '@k-os/core';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { stripUndefined } from './_helpers';

const app = new Hono<{ Variables: AuthVariables }>();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  standard: z.string().min(1).max(500),
  cadence: z.string().max(120).nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  nextReviewAt: z.string().datetime().nullable().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  standard: z.string().min(1).max(500).optional(),
  cadence: z.string().max(120).nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  nextReviewAt: z.string().datetime().nullable().optional(),
});

const archiveSchema = z.object({
  reason: z.enum(ARCHIVE_REASONS),
  note: z.string().max(500).nullable().optional(),
});

const reviewSchema = z.object({
  nextReviewAt: z.string().datetime().nullable().optional(),
});

const DEFAULT_REVIEW_BUMP_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

app.get('/', async (c) => {
  const archived = c.req.query('archived') === 'true';
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const rows = await db
    .select()
    .from(areas)
    .where(
      and(
        eq(areas.workspaceId, workspaceId),
        archived ? isNotNull(areas.archivedAt) : isNull(areas.archivedAt),
      ),
    )
    .orderBy(asc(areas.name));
  return c.json({ areas: rows });
});

app.get('/:id', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .select()
    .from(areas)
    .where(and(eq(areas.id, c.req.param('id')), eq(areas.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ area: row });
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
    .insert(areas)
    .values({
      workspaceId,
      name: d.name.trim(),
      standard: d.standard.trim(),
      cadence: d.cadence ?? null,
      contextId: d.contextId ?? null,
      nextReviewAt: d.nextReviewAt ? new Date(d.nextReviewAt) : null,
      createdBy: user.id,
    })
    .returning();
  return c.json({ area: row }, 201);
});

app.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const stripped = stripUndefined(parsed.data);
  if (Object.keys(stripped).length === 0) {
    return c.json({ error: 'empty_patch' }, 400);
  }
  const patch: {
    name?: string;
    standard?: string;
    cadence?: string | null;
    contextId?: string | null;
    nextReviewAt?: Date | null;
  } = {};
  if (stripped.name !== undefined) patch.name = stripped.name;
  if (stripped.standard !== undefined) patch.standard = stripped.standard;
  if (stripped.cadence !== undefined) patch.cadence = stripped.cadence;
  if (stripped.contextId !== undefined) patch.contextId = stripped.contextId;
  if (stripped.nextReviewAt !== undefined) {
    patch.nextReviewAt = stripped.nextReviewAt ? new Date(stripped.nextReviewAt) : null;
  }

  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .update(areas)
    .set(patch)
    .where(and(eq(areas.id, c.req.param('id')), eq(areas.workspaceId, workspaceId)))
    .returning();
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ area: row });
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
    .update(areas)
    .set({
      archivedAt: new Date(),
      archiveReason: parsed.data.reason,
      archiveNote: parsed.data.note ?? null,
      archivedBy: user.id,
    })
    .where(
      and(
        eq(areas.id, c.req.param('id')),
        eq(areas.workspaceId, workspaceId),
        isNull(areas.archivedAt),
      ),
    )
    .returning();
  if (!row) return c.json({ error: 'not_found_or_already_archived' }, 404);
  return c.json({ area: row });
});

app.post('/:id/restore', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const [row] = await db
    .update(areas)
    .set({ archivedAt: null, archiveReason: null, archiveNote: null, archivedBy: null })
    .where(
      and(
        eq(areas.id, c.req.param('id')),
        eq(areas.workspaceId, workspaceId),
        isNotNull(areas.archivedAt),
      ),
    )
    .returning();
  if (!row) return c.json({ error: 'not_found_or_not_archived' }, 404);
  return c.json({ area: row });
});

app.post('/:id/review', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const now = new Date();
  const nextReviewAt =
    parsed.data.nextReviewAt === null
      ? null
      : parsed.data.nextReviewAt
        ? new Date(parsed.data.nextReviewAt)
        : new Date(now.getTime() + DEFAULT_REVIEW_BUMP_MS);
  const [row] = await db
    .update(areas)
    .set({ lastReviewedAt: now, nextReviewAt })
    .where(and(eq(areas.id, c.req.param('id')), eq(areas.workspaceId, workspaceId)))
    .returning();
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ area: row });
});

// ---------------------------------------------------------------------------
// Area ↔ People junction
// ---------------------------------------------------------------------------

const linkSchema = z.object({
  personId: z.string().uuid(),
  role: z.string().max(80).nullable().optional(),
});

async function ensureAreaInWorkspace(workspaceId: string, areaId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.workspaceId, workspaceId)))
    .limit(1);
  return !!row;
}

app.get('/:id/people', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const areaId = c.req.param('id');
  if (!(await ensureAreaInWorkspace(workspaceId, areaId))) {
    return c.json({ error: 'not_found' }, 404);
  }
  const db = getDb();
  const rows = await db
    .select({
      personId: areaPeople.personId,
      role: areaPeople.role,
      name: peopleTable.name,
      initials: peopleTable.initials,
      color: peopleTable.color,
    })
    .from(areaPeople)
    .innerJoin(peopleTable, eq(peopleTable.id, areaPeople.personId))
    .where(eq(areaPeople.areaId, areaId));
  return c.json({ people: rows });
});

app.post('/:id/people', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const areaId = c.req.param('id');
  if (!(await ensureAreaInWorkspace(workspaceId, areaId))) {
    return c.json({ error: 'not_found' }, 404);
  }
  const db = getDb();
  const [pers] = await db
    .select({ id: peopleTable.id })
    .from(peopleTable)
    .where(
      and(eq(peopleTable.id, parsed.data.personId), eq(peopleTable.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!pers) return c.json({ error: 'person_not_found' }, 404);

  await db
    .insert(areaPeople)
    .values({
      areaId,
      personId: parsed.data.personId,
      role: parsed.data.role ?? null,
    })
    .onConflictDoUpdate({
      target: [areaPeople.areaId, areaPeople.personId],
      set: { role: parsed.data.role ?? null },
    });
  return c.json({ ok: true }, 201);
});

app.delete('/:id/people/:personId', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const areaId = c.req.param('id');
  if (!(await ensureAreaInWorkspace(workspaceId, areaId))) {
    return c.json({ error: 'not_found' }, 404);
  }
  const db = getDb();
  await db
    .delete(areaPeople)
    .where(
      and(eq(areaPeople.areaId, areaId), eq(areaPeople.personId, c.req.param('personId'))),
    );
  return c.json({ ok: true });
});

export default app;
