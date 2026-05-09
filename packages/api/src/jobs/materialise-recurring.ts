/**
 * Recurring task materialisation.
 *
 * Templates are tasks with `recurring_rule IS NOT NULL` (and they're
 * filtered out of `active_tasks`). Instances reference their template via
 * `parent_recurring_id` and inherit the template's metadata at create time.
 *
 * The job is idempotent: a `(parent_recurring_id, scheduled_at)` uniqueness
 * check prevents re-materialising the same instance on reruns. Run nightly
 * via `pg_cron` or a Vercel cron (Block 18 wires the schedule); the
 * `/admin/materialise-recurring` route lets the user trigger it manually.
 *
 * Scope limits in this MVP:
 *   - Materialises the next 7 days from `from`.
 *   - Inherits priority, context_id, project_id, area_id, person_id,
 *     owner_id, description, title from the template.
 *   - Sets the instance's `scheduled_at` to the occurrence date (00:00).
 *     Block 14 (Areas) and Block 16 (Task detail) may surface a "default
 *     time" the instance should land at.
 */

import { and, eq, isNotNull } from 'drizzle-orm';
import { tasks, type Db } from '@k-os/db';
import { nextOccurrences, type RecurringRule } from '@k-os/core';

export interface MaterialiseInput {
  workspaceId: string;
  /** Defaults to now. */
  from?: Date;
  /** Defaults to from + 7 days. */
  until?: Date;
}

export interface MaterialiseResult {
  templatesScanned: number;
  instancesCreated: number;
}

const DEFAULT_HORIZON_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function materialiseRecurring(
  db: Db,
  input: MaterialiseInput,
): Promise<MaterialiseResult> {
  const from = input.from ?? new Date();
  const until = input.until ?? new Date(from.getTime() + DEFAULT_HORIZON_MS);

  const templates = await db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.workspaceId, input.workspaceId), isNotNull(tasks.recurringRule)),
    );

  let instancesCreated = 0;

  for (const template of templates) {
    const rule = template.recurringRule as RecurringRule | null;
    if (!rule) continue;

    const occurrences = nextOccurrences(rule, from, until);
    if (occurrences.length === 0) continue;

    // Find which occurrences already have an instance — one query per template
    // is fine because templates are rare and occurrences are bounded.
    const existing = await db
      .select({ scheduledAt: tasks.scheduledAt })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, input.workspaceId),
          eq(tasks.parentRecurringId, template.id),
        ),
      );
    const existingTimes = new Set(
      existing
        .map((r) => r.scheduledAt?.getTime())
        .filter((t): t is number => typeof t === 'number'),
    );

    const toCreate = occurrences.filter((o) => !existingTimes.has(o.getTime()));
    if (toCreate.length === 0) continue;

    await db.insert(tasks).values(
      toCreate.map((scheduledAt) => ({
        workspaceId: input.workspaceId,
        title: template.title,
        description: template.description,
        status: 'next' as const,
        priority: template.priority,
        contextId: template.contextId,
        projectId: template.projectId,
        areaId: template.areaId,
        personId: template.personId,
        ownerId: template.ownerId,
        scheduledAt,
        parentRecurringId: template.id,
        createdBy: template.createdBy,
      })),
    );
    instancesCreated += toCreate.length;
  }

  return { templatesScanned: templates.length, instancesCreated };
}
