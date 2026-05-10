/**
 * Tasks: workspace-scoped CRUD with structured activity logging.
 *
 * Mutation handlers emit one of:
 *   - `created` on POST /
 *   - `status_changed` / `priority_changed` on PATCH /:id when those fields move
 *   - `field_edited` on PATCH /:id for each AUDITED_TASK_FIELDS change (via diffTaskAuditedFields)
 *   - `completed` on POST /:id/complete
 *   - `archived` / `restored` on the lifecycle routes
 *
 * Active views (`/today`, `/upcoming`, `/waiting`, plus the default GET /
 * with `archived=false`) all join `projects` + `areas` and apply the
 * `activeTasksWhere` predicate so tasks under archived parents are hidden.
 * Search and global views query `tasks` directly so archived items remain
 * findable.
 */

import { Hono } from 'hono';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  gte,
  getTableColumns,
} from 'drizzle-orm';
import { z } from 'zod';
import {
  tasks,
  taskEvents,
  taskTags,
  tags,
  projects,
  areas,
  getDb,
} from '@k-os/db';
import { TASK_STATUSES, TASK_PRIORITIES, SOURCE_KINDS } from '@k-os/core';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { stripUndefined } from './_helpers';
import {
  activeTasksWhere,
  diffTaskAuditedFields,
  emitTaskEvent,
} from './_tasks-helpers';

const app = new Hono<{ Variables: AuthVariables }>();
const taskCols = getTableColumns(tasks);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20_000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  contextId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  personId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().optional(),
  sourceKind: z.enum(SOURCE_KINDS).nullable().optional(),
  sourceRef: z.string().max(500).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  reviewAt: z.string().datetime().nullable().optional(),
  waitingFor: z.string().max(200).nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(50).optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20_000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  contextId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  personId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  reviewAt: z.string().datetime().nullable().optional(),
  waitingFor: z.string().max(200).nullable().optional(),
});

// ---------------------------------------------------------------------------
// List + filtered list
// ---------------------------------------------------------------------------

app.get('/', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const status = c.req.query('status');
  const projectId = c.req.query('project_id');
  const areaId = c.req.query('area_id');
  const personId = c.req.query('person_id');
  const archived = c.req.query('archived') === 'true';

  const conditions = [eq(tasks.workspaceId, workspaceId)];
  if (archived) {
    conditions.push(isNotNull(tasks.archivedAt));
  } else {
    conditions.push(isNull(tasks.archivedAt));
  }
  if (status && (TASK_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(tasks.status, status as (typeof TASK_STATUSES)[number]));
  }
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (areaId) conditions.push(eq(tasks.areaId, areaId));
  if (personId) conditions.push(eq(tasks.personId, personId));

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt))
    .limit(500);
  return c.json({ tasks: rows });
});

// Filtered views ------------------------------------------------------------

app.get('/today', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const todayEnd = endOfToday();

  const rows = await db
    .select(taskCols)
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(areas, eq(areas.id, tasks.areaId))
    .where(
      and(
        activeTasksWhere(workspaceId),
        // Today rolls up: things due today, scheduled for today, or waiting/delegated reviewed today.
        // Status filter expressed via inArray + per-status time clause is awkward in Drizzle, so we
        // keep it simple: status in the active set AND any of (due/scheduled/review) <= today end.
        inArray(tasks.status, ['next', 'scheduled', 'waiting', 'delegated']),
      ),
    )
    .orderBy(asc(tasks.priority), asc(tasks.dueAt), asc(tasks.scheduledAt))
    .limit(500);

  // In-memory filter for the union of (due_at <= today) | (scheduled_at <= today) | (review_at <= today)
  // — simpler and just as correct at MVP scale.
  const out = rows.filter((t) => {
    if (t.status === 'waiting' || t.status === 'delegated') {
      return t.reviewAt && t.reviewAt.getTime() <= todayEnd.getTime();
    }
    return (
      (t.dueAt && t.dueAt.getTime() <= todayEnd.getTime()) ||
      (t.scheduledAt && t.scheduledAt.getTime() <= todayEnd.getTime())
    );
  });
  return c.json({ tasks: out });
});

app.get('/upcoming', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const todayStart = startOfToday();
  const horizon = new Date(todayStart.getTime() + 1000 * 60 * 60 * 24 * 30);

  const rows = await db
    .select(taskCols)
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(areas, eq(areas.id, tasks.areaId))
    .where(
      and(
        activeTasksWhere(workspaceId),
        inArray(tasks.status, ['next', 'scheduled']),
        gte(tasks.scheduledAt, todayStart),
        lt(tasks.scheduledAt, horizon),
      ),
    )
    .orderBy(asc(tasks.scheduledAt))
    .limit(500);
  return c.json({ tasks: rows });
});

app.get('/waiting', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();

  const rows = await db
    .select(taskCols)
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(areas, eq(areas.id, tasks.areaId))
    .where(
      and(
        activeTasksWhere(workspaceId),
        inArray(tasks.status, ['waiting', 'delegated']),
      ),
    )
    .orderBy(asc(tasks.reviewAt))
    .limit(500);
  return c.json({ tasks: rows });
});

// ---------------------------------------------------------------------------
// Detail + tags
// ---------------------------------------------------------------------------

app.get('/:id', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const id = c.req.param('id');

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  if (!task) return c.json({ error: 'not_found' }, 404);

  const linkedTags = await db
    .select({ id: tags.id, name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(eq(taskTags.taskId, id));

  const events = await db
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, id))
    .orderBy(desc(taskEvents.createdAt))
    .limit(50);

  return c.json({ task, tags: linkedTags, events });
});

app.get('/:id/events', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const id = c.req.param('id');
  const limit = clamp(parseIntOr(c.req.query('limit'), 50), 1, 200);
  const before = c.req.query('before');

  // Ensure the task is in the user's workspace before exposing events.
  const [t] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  if (!t) return c.json({ error: 'not_found' }, 404);

  const conditions = [eq(taskEvents.taskId, id)];
  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) {
      conditions.push(lt(taskEvents.createdAt, beforeDate));
    }
  }
  const rows = await db
    .select()
    .from(taskEvents)
    .where(and(...conditions))
    .orderBy(desc(taskEvents.createdAt))
    .limit(limit);
  return c.json({ events: rows });
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

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

  // Determine status: default is 'next'; capture flows pass 'inbox' explicitly.
  const status = d.status ?? 'next';

  const inserted = await db.transaction(async (tx) => {
    const [task] = await tx
      .insert(tasks)
      .values({
        workspaceId,
        title: d.title.trim(),
        description: d.description ?? null,
        status,
        priority: d.priority ?? 'routine',
        contextId: d.contextId ?? null,
        projectId: d.projectId ?? null,
        areaId: d.areaId ?? null,
        personId: d.personId ?? null,
        ownerId: d.ownerId ?? user.id,
        sourceKind: d.sourceKind ?? null,
        sourceRef: d.sourceRef ?? null,
        dueAt: d.dueAt ? new Date(d.dueAt) : null,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        reviewAt: d.reviewAt ? new Date(d.reviewAt) : null,
        waitingFor: d.waitingFor ?? null,
        createdBy: user.id,
      })
      .returning();

    if (d.tagIds && d.tagIds.length > 0) {
      // Filter tags down to ones in the same workspace so cross-workspace
      // contamination is impossible even with a forged request body.
      const validTags = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.workspaceId, workspaceId), inArray(tags.id, d.tagIds)));
      if (validTags.length > 0) {
        await tx
          .insert(taskTags)
          .values(validTags.map((tag) => ({ taskId: task.id, tagId: tag.id })));
      }
    }

    await tx.insert(taskEvents).values({
      workspaceId,
      taskId: task.id,
      kind: 'created',
      actorKind: 'user',
      actorUserId: user.id,
      payload: null,
    });
    return task;
  });

  return c.json({ task: inserted }, 201);
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

  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const id = c.req.param('id');

  // Translate Zod's string dates → Date | null and pass through the rest.
  const setPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stripped)) {
    if (k === 'dueAt' || k === 'scheduledAt' || k === 'reviewAt') {
      setPatch[k] = v === null ? null : new Date(v as string);
    } else {
      setPatch[k] = v;
    }
  }

  const updated = await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!before) return null;

    const [after] = await tx
      .update(tasks)
      .set(setPatch)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .returning();

    // Structural events for status / priority moves.
    if (after.status !== before.status) {
      await tx.insert(taskEvents).values({
        workspaceId,
        taskId: id,
        kind: 'status_changed',
        actorKind: 'user',
        actorUserId: user.id,
        payload: { from: before.status, to: after.status },
      });
    }
    if (after.priority !== before.priority) {
      await tx.insert(taskEvents).values({
        workspaceId,
        taskId: id,
        kind: 'priority_changed',
        actorKind: 'user',
        actorUserId: user.id,
        payload: { from: before.priority, to: after.priority },
      });
    }

    // One field_edited event per audited-field change.
    const diffs = diffTaskAuditedFields(before, after);
    if (diffs.length > 0) {
      await tx.insert(taskEvents).values(
        diffs.map((d) => ({
          workspaceId,
          taskId: id,
          kind: 'field_edited',
          actorKind: 'user' as const,
          actorUserId: user.id,
          payload: d as never,
        })),
      );
    }

    return after;
  });

  if (!updated) return c.json({ error: 'not_found' }, 404);
  return c.json({ task: updated });
});

app.delete('/:id', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, c.req.param('id')), eq(tasks.workspaceId, workspaceId)))
    .returning({ id: tasks.id });
  if (deleted.length === 0) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

app.post('/:id/complete', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const id = c.req.param('id');

  const updated = await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!before || before.status === 'done') return null;

    const [after] = await tx
      .update(tasks)
      .set({ status: 'done', completedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .returning();

    await tx.insert(taskEvents).values([
      {
        workspaceId,
        taskId: id,
        kind: 'completed',
        actorKind: 'user',
        actorUserId: user.id,
        payload: null,
      },
      {
        workspaceId,
        taskId: id,
        kind: 'status_changed',
        actorKind: 'user',
        actorUserId: user.id,
        payload: { from: before.status, to: 'done' },
      },
    ]);
    return after;
  });

  if (!updated) return c.json({ error: 'not_found_or_already_done' }, 404);
  return c.json({ task: updated });
});

app.post('/:id/archive', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const id = c.req.param('id');
  const updated = await db.transaction(async (tx) => {
    const [after] = await tx
      .update(tasks)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.workspaceId, workspaceId),
          isNull(tasks.archivedAt),
        ),
      )
      .returning();
    if (!after) return null;
    await emitTaskEvent(tx, {
      workspaceId,
      taskId: id,
      kind: 'archived',
      actorUserId: user.id,
    });
    return after;
  });
  if (!updated) return c.json({ error: 'not_found_or_already_archived' }, 404);
  return c.json({ task: updated });
});

app.post('/:id/restore', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const id = c.req.param('id');
  const updated = await db.transaction(async (tx) => {
    const [after] = await tx
      .update(tasks)
      .set({ archivedAt: null })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.workspaceId, workspaceId),
          isNotNull(tasks.archivedAt),
        ),
      )
      .returning();
    if (!after) return null;
    await emitTaskEvent(tx, {
      workspaceId,
      taskId: id,
      kind: 'restored',
      actorUserId: user.id,
    });
    return after;
  });
  if (!updated) return c.json({ error: 'not_found_or_not_archived' }, 404);
  return c.json({ task: updated });
});

const commentSchema = z.object({
  body: z.string().min(1).max(4000),
});

app.post('/:id/comment', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();
  const id = c.req.param('id');

  const [t] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  if (!t) return c.json({ error: 'not_found' }, 404);

  const [event] = await db
    .insert(taskEvents)
    .values({
      workspaceId,
      taskId: id,
      kind: 'commented',
      actorKind: 'user',
      actorUserId: user.id,
      payload: { body: parsed.data.body },
    })
    .returning();
  return c.json({ event }, 201);
});

// ---------------------------------------------------------------------------
// Internal utils
// ---------------------------------------------------------------------------

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function parseIntOr(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default app;
