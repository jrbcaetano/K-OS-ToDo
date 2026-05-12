/**
 * Inbox routes.
 *
 * Per Q9 of the schema doc: inbox is a status, not a separate table.
 * `GET /` is shorthand for `tasks?status=inbox`. Capture creates a task
 * with `status='inbox'`. Triage applies optional accepted suggestions and
 * sets the new status. Discard archives the inbox row.
 *
 * Per [[0020 - agent-native-architecture-agents-external-to-platform]] the
 * platform does NOT call any LLM here. `tasks.ai_parsed` is filled by an
 * external agent service via a subsequent PATCH; the platform only writes
 * what the user (or the agent acting through the public API) tells it to.
 */

import { Hono } from 'hono';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { tasks, taskEvents, getDb } from '@k-os/db';
import { TASK_STATUSES, TASK_PRIORITIES, SOURCE_KINDS } from '@k-os/core';
import {
  actorEventStamp,
  actorUserId,
  type Actor,
  type AuthVariables,
} from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { emitTaskEvent, selectTasksWithRefs, shapeTaskRow } from './_tasks-helpers';

const app = new Hono<{ Variables: AuthVariables }>();

// `inbox` is included in TASK_STATUSES; users triage TO any other status.
const TRIAGE_TARGET_STATUSES = TASK_STATUSES.filter((s) => s !== 'inbox') as Array<
  Exclude<(typeof TASK_STATUSES)[number], 'inbox'>
>;

const captureSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20_000).nullable().optional(),
  sourceKind: z.enum(SOURCE_KINDS).nullable().optional(),
  sourceRef: z.string().max(500).nullable().optional(),
  // Optional structured attachments selected via the quick-capture slash menu.
  // When `status` is provided and not `inbox`, the task is created directly in
  // that status (the capture flow doubles as a one-shot triage).
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  contextId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  personId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const triageSchema = z.object({
  status: z.enum(TRIAGE_TARGET_STATUSES as unknown as [string, ...string[]]),
  // Optional fields the user accepted from AI suggestions or set explicitly.
  contextId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  personId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  reviewAt: z.string().datetime().nullable().optional(),
  waitingFor: z.string().max(200).nullable().optional(),
});

app.get('/', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const db = getDb();
  const rows = await selectTasksWithRefs(db)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.status, 'inbox'),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(desc(tasks.createdAt))
    .limit(500);
  return c.json({ tasks: rows.map(shapeTaskRow) });
});

app.post('/capture', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const actor: Actor = c.get('actor');
  const userId = actorUserId(actor);
  const db = getDb();

  // Per ADR 0020: the platform doesn't fill `ai_parsed`. An external agent
  // observes the new inbox row (via list / webhooks / polling) and PATCHes
  // its parse result back through the public API.

  const d = parsed.data;
  const status = d.status ?? 'inbox';
  const priority = d.priority ?? 'routine';

  const task = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tasks)
      .values({
        workspaceId,
        title: d.title.trim(),
        description: d.description ?? null,
        status,
        priority,
        contextId: d.contextId ?? null,
        projectId: d.projectId ?? null,
        areaId: d.areaId ?? null,
        personId: d.personId ?? null,
        dueAt: d.dueAt ? new Date(d.dueAt) : null,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        sourceKind: d.sourceKind ?? 'manual',
        sourceRef: d.sourceRef ?? null,
        ownerId: userId,
        createdBy: userId,
      })
      .returning();
    await emitTaskEvent(tx, {
      workspaceId,
      taskId: row.id,
      kind: 'created',
      actor,
      payload: { source: 'inbox_capture', status },
    });
    return row;
  });

  return c.json({ task }, 201);
});

app.post('/:id/triage', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = triageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const actor: Actor = c.get('actor');
  const stamp = actorEventStamp(actor);
  const db = getDb();
  const id = c.req.param('id');
  const d = parsed.data;

  const updated = await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!before || before.status !== 'inbox') return null;

    const setPatch: Record<string, unknown> = { status: d.status };
    if (d.contextId !== undefined) setPatch.contextId = d.contextId;
    if (d.projectId !== undefined) setPatch.projectId = d.projectId;
    if (d.areaId !== undefined) setPatch.areaId = d.areaId;
    if (d.personId !== undefined) setPatch.personId = d.personId;
    if (d.dueAt !== undefined) setPatch.dueAt = d.dueAt ? new Date(d.dueAt) : null;
    if (d.scheduledAt !== undefined)
      setPatch.scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
    if (d.reviewAt !== undefined)
      setPatch.reviewAt = d.reviewAt ? new Date(d.reviewAt) : null;
    if (d.waitingFor !== undefined) setPatch.waitingFor = d.waitingFor;

    const [after] = await tx
      .update(tasks)
      .set(setPatch)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .returning();

    await tx.insert(taskEvents).values({
      workspaceId,
      taskId: id,
      kind: 'status_changed',
      actorKind: stamp.actorKind,
      actorUserId: stamp.actorUserId,
      payload: { from: 'inbox', to: d.status, source: 'triage' },
    });

    return after;
  });

  if (!updated) return c.json({ error: 'not_found_or_already_triaged' }, 404);
  return c.json({ task: updated });
});

app.post('/:id/discard', async (c) => {
  const workspaceId = getWorkspaceId(c);
  const actor: Actor = c.get('actor');
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
          eq(tasks.status, 'inbox'),
          isNull(tasks.archivedAt),
        ),
      )
      .returning();
    if (!after) return null;
    await emitTaskEvent(tx, {
      workspaceId,
      taskId: id,
      kind: 'archived',
      actor,
      payload: { source: 'inbox_discard' },
    });
    return after;
  });
  if (!updated) return c.json({ error: 'not_found_or_not_in_inbox' }, 404);
  return c.json({ task: updated });
});

export default app;
