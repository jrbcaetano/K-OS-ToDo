/**
 * Activity-log audit configuration for tasks.
 *
 * The `task_events` table records two kinds of events:
 *
 *   1. STRUCTURAL events — always logged. Fixed list below.
 *   2. FIELD-EDIT events — generated when a column listed in
 *      `AUDITED_TASK_FIELDS` changes. The mutation handler computes a diff
 *      between old and new task state and emits one `field_edited` event per
 *      changed audited field, with `payload: { field, from, to }`.
 *
 * To add a field to the audit log: add its name to AUDITED_TASK_FIELDS.
 * To stop auditing a field: remove it. Existing events stay (history is
 * preserved); future edits to that field stop generating events.
 *
 * See docs/schema.md → "Audit configuration" for the rationale.
 */

export const AUDITED_TASK_FIELDS = [
  'due_at',
  'scheduled_at',
  'review_at',
  'project_id',
  'area_id',
  'person_id',
  'owner_id',
  'context_id',
  'description',
] as const;

export type AuditedTaskField = (typeof AUDITED_TASK_FIELDS)[number];

export const STRUCTURAL_TASK_EVENT_KINDS = [
  'created',
  'status_changed',
  'priority_changed',
  'completed',
  'archived',
  'restored',
  'commented',
  'agent_suggested',
  'agent_acted',
] as const;

export type StructuralTaskEventKind = (typeof STRUCTURAL_TASK_EVENT_KINDS)[number];

/** All task event kinds — structural plus the generic field-edit kind. */
export type TaskEventKind = StructuralTaskEventKind | 'field_edited';

/**
 * Helper for the mutation layer: given the previous and next state of a task,
 * return the changed audited fields. The caller emits one `field_edited`
 * event per entry.
 */
export function diffAuditedFields<T extends Record<string, unknown>>(
  previous: T,
  next: T,
): Array<{ field: AuditedTaskField; from: unknown; to: unknown }> {
  const changes: Array<{ field: AuditedTaskField; from: unknown; to: unknown }> = [];
  for (const field of AUDITED_TASK_FIELDS) {
    if (previous[field] !== next[field]) {
      changes.push({ field, from: previous[field], to: next[field] });
    }
  }
  return changes;
}
