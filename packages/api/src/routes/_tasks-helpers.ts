/**
 * Shared helpers for the tasks routes (and inbox routes in Block 7).
 *
 *   - `activeTasksWhere` reproduces the `active_tasks` view condition as a
 *     Drizzle expression so we don't have to leave the typed query layer
 *     and drop into raw SQL. Stays in lockstep with the view in
 *     migrations/0001_active_tasks_view.sql.
 *   - `emitTaskEvent` writes one row to `task_events`. The structural
 *     event kinds come from `STRUCTURAL_TASK_EVENT_KINDS` in
 *     `@k-os/core/audit` plus the generic `field_edited` kind.
 *   - `diffTaskAuditedFields` walks `AUDITED_TASK_FIELDS` against camelCase
 *     Drizzle rows and emits one entry per changed audited field. The
 *     `field` value in the payload is snake_case (matches the schema).
 */

import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import {
  tasks,
  taskEvents,
  projects,
  areas,
  type Db,
} from '@k-os/db';
import {
  AUDITED_TASK_FIELDS,
  type AuditedTaskField,
  type TaskEventKind,
} from '@k-os/core';
import { actorEventStamp, type Actor } from '../middleware/auth';

/**
 * WHERE expression matching the `active_tasks` view. Apply with a
 * `LEFT JOIN projects` + `LEFT JOIN areas` in the same query so the
 * archive-state predicates can reach those tables.
 */
export function activeTasksWhere(workspaceId: string): SQL {
  // eq() returns SQL; combining via and()+or() preserves type-inference.
  return and(
    eq(tasks.workspaceId, workspaceId),
    isNull(tasks.archivedAt),
    isNull(tasks.recurringRule),
    or(isNull(tasks.projectId), isNull(projects.archivedAt))!,
    or(isNull(tasks.areaId), isNull(areas.archivedAt))!,
  )!;
}

export interface EmitTaskEventInput {
  workspaceId: string;
  taskId: string;
  kind: TaskEventKind;
  /** The Actor performing the action — discriminated user/agent. */
  actor: Actor;
  payload?: unknown;
}

/** Either the top-level Db client or a transaction handle from `db.transaction(...)`. */
type TxLike = Parameters<Parameters<Db['transaction']>[0]>[0] | Db;

/** Insert one row into `task_events`. The `actor_kind` and `actor_user_id`
 *  columns are derived from the Actor via `actorEventStamp` so an agent's
 *  action lands as `actor_kind='agent'` per [[0020]]. */
export async function emitTaskEvent(tx: TxLike, input: EmitTaskEventInput): Promise<void> {
  const stamp = actorEventStamp(input.actor);
  await tx.insert(taskEvents).values({
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    kind: input.kind,
    actorKind: stamp.actorKind,
    actorUserId: stamp.actorUserId,
    payload: (input.payload ?? null) as never,
  });
}

/**
 * Map snake_case audited field names to Drizzle's camelCase row keys.
 * Single source of truth for the rename — adding a field to the audit
 * list (in @k-os/core) requires adding the corresponding entry here.
 */
const FIELD_KEY_MAP: Record<AuditedTaskField, keyof typeof tasks.$inferSelect> = {
  due_at: 'dueAt',
  scheduled_at: 'scheduledAt',
  review_at: 'reviewAt',
  project_id: 'projectId',
  area_id: 'areaId',
  person_id: 'personId',
  owner_id: 'ownerId',
  context_id: 'contextId',
  description: 'description',
};

export interface AuditedFieldChange {
  field: AuditedTaskField;
  from: unknown;
  to: unknown;
}

/** Diff two task rows (Drizzle camelCase shape) and return an array of
 *  field changes. Compares Date values by `getTime()` to avoid spurious
 *  diffs from re-instantiated dates. */
export function diffTaskAuditedFields(
  before: typeof tasks.$inferSelect,
  after: typeof tasks.$inferSelect,
): AuditedFieldChange[] {
  const changes: AuditedFieldChange[] = [];
  for (const field of AUDITED_TASK_FIELDS) {
    const key = FIELD_KEY_MAP[field];
    const a = before[key];
    const b = after[key];
    if (!sameValue(a, b)) {
      changes.push({ field, from: a ?? null, to: b ?? null });
    }
  }
  return changes;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a == null && b == null) return true;
  return a === b;
}

// Re-export so route files only need to import from this module.
export { sql };
