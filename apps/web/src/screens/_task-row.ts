/**
 * Shared TaskDto → TaskRowModel adapter for list screens.
 *
 * Date labels follow the prototype's behaviour: pick the most relevant
 * timestamp for the task's status (review for waiting/delegated; due
 * otherwise; scheduled as fallback). Date state is `'overdue' | 'today' |
 * 'normal'` based on which window the timestamp falls into.
 *
 * If three or more screens want a different shape (waiting-since label,
 * relative-time label, etc.), extend the options bag rather than forking
 * the helper.
 */

import type { TaskRowModel } from '@k-os/ui';
import type { TaskDto } from '../api/tasks';

export interface ToRowOptions {
  /** When true, derive a `waiting <Nd>` label from `createdAt` for the meta row. */
  showWaitingSince?: boolean;
}

export function toRowModel(t: TaskDto, opts: ToRowOptions = {}): TaskRowModel {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    done: t.status === 'done',
    context: t.context ?? null,
    // Fall back to area name when the task is filed under an area rather
    // than a project (the design's "proj chip" reads either as the parent).
    projectName: t.project?.name ?? t.area?.name ?? null,
    person: t.person
      ? { name: t.person.name, initials: t.person.initials, color: t.person.color }
      : null,
    dateLabel: chooseDateLabel(t),
    dateState: chooseDateState(t),
    waitingSince: opts.showWaitingSince ? formatWaitingSince(t.createdAt) : null,
  };
}

function chooseDateLabel(t: TaskDto): string | null {
  if (t.status === 'waiting' || t.status === 'delegated') {
    return t.reviewAt ? formatShortDate(new Date(t.reviewAt)) : null;
  }
  if (t.dueAt) return formatShortDate(new Date(t.dueAt));
  if (t.scheduledAt) return formatShortDate(new Date(t.scheduledAt));
  return null;
}

function chooseDateState(t: TaskDto): 'overdue' | 'today' | 'normal' {
  const target = t.dueAt ?? t.scheduledAt ?? t.reviewAt;
  if (!target) return 'normal';
  const ms = Date.parse(target);
  const start = startOfToday();
  const end = endOfToday();
  if (ms < start.getTime()) return 'overdue';
  if (ms <= end.getTime()) return 'today';
  return 'normal';
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatShortDate(d: Date): string {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatWaitingSince(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'today';
  return `${days}d`;
}
