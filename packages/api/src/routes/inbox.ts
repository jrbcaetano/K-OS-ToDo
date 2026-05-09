/**
 * Inbox routes.
 *
 * Per Q9 of the schema doc: inbox is a status, not a separate table.
 * `GET /` is shorthand for `tasks?status=inbox`. Capture creates a task
 * with `status='inbox'`. Triage applies optional accepted suggestions and
 * sets the new status. Discard archives the inbox row.
 *
 * AI parse is a marked no-op for now — Block 18 wires the actual
 * Anthropic call and stores `tasks.ai_parsed`.
 */

import { Hono } from 'hono';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { tasks, taskEvents, getDb } from '@k-os/db';
import { TASK_STATUSES, SOURCE_KINDS } from '@k-os/core';
import type { AuthVariables } from '../middleware/auth';
import { getWorkspaceId } from '../middleware/workspace';
import { emitTaskEvent } from './_tasks-helpers';

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
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.status, 'inbox'),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(desc(tasks.createdAt))
    .limit(500);
  return c.json({ tasks: rows });
});

app.post('/capture', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const workspaceId = getWorkspaceId(c);
  const user = c.get('user');
  const db = getDb();

  // AI parse hook — stays a no-op until Block 18.
  // const aiParsed = await parseCapture(...);  // deferred to Block 18
  const aiParsed = null;

  const task = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tasks)
      .values({
        workspaceId,
        title: parsed.data.title.trim(),
        description: parsed.data.description ?? null,
        status: 'inbox',
        priority: 'routine',
        sourceKind: parsed.data.sourceKind ?? 'manual',
        sourceRef: parsed.data.sourceRef ?? null,
        ownerId: user.id,
        createdBy: user.id,
        aiParsed,
      })
      .returning();
    await emitTaskEvent(tx, {
      workspaceId,
      taskId: row.id,
      kind: 'created',
      actorUserId: user.id,
      payload: { source: 'inbox_capture' },
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
  const user = c.get('user');
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
      actorKind: 'user',
      actorUserId: user.id,
      payload: { from: 'inbox', to: d.status, source: 'triage' },
    });

    return after;
  });

  if (!updated) return c.json({ error: 'not_found_or_already_triaged' }, 404);
  return c.json({ task: updated });
});

app.post('/:id/discard', async (c) => {
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
      actorUserId: user.id,
      payload: { source: 'inbox_discard' },
    });
    return after;
  });
  if (!updated) return c.json({ error: 'not_found_or_not_in_inbox' }, 404);
  return c.json({ task: updated });
});

export default app;
