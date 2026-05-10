/**
 * Today screen.
 *
 * Reads /api/tasks/today (already filtered server-side to today-relevant
 * statuses + dates per the schema's "Today" view) and buckets the rows
 * into Overdue / Due / Followups / Scheduled. The "Focus" section from
 * the prototype isn't wired yet — there's no `pinned` flag on tasks.
 *
 * KPIs are computed live from the same response — no extra request.
 *
 * Keeps date math in this file (not the primitives) so the TaskRow
 * component stays purely presentational.
 */

import { SectionHead, TaskRow, type TaskRowModel } from '@k-os/ui';
import { useTasksToday, type TaskDto } from '../api/tasks';
import { useOpenTask } from './_use-open-task';
import styles from './Today.module.css';

export function TodayScreen() {
  const query = useTasksToday();
  const open = useOpenTask();

  if (query.isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }
  if (query.isError) {
    return (
      <div className={styles.error}>
        Couldn’t load Today. {(query.error as Error)?.message ?? 'Unknown error.'}
      </div>
    );
  }

  const tasks = query.data?.tasks ?? [];
  const buckets = bucket(tasks);
  const dateline = formatDateline(new Date());
  const kpis = {
    due: buckets.due.length,
    overdue: buckets.overdue.length,
    followups: buckets.followups.length,
    critical: tasks.filter((t) => t.priority === 'critical').length,
  };

  return (
    <>
      <div className={styles.greeting}>
        <div>
          <div className={styles.dateline}>{dateline}</div>
          <h2 className={styles.heading}>Good day.</h2>
          <div className={styles.subline}>
            {kpis.due} due · {kpis.followups} follow-ups · {kpis.overdue} overdue
          </div>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <Kpi label="Due today" value={kpis.due} meta={kpis.critical ? `${kpis.critical} critical` : null} />
        <Kpi
          label="Overdue"
          value={kpis.overdue}
          critical={kpis.overdue > 0}
          meta={kpis.overdue > 0 ? 'needs triage' : null}
          metaAlert={kpis.overdue > 0}
        />
        <Kpi label="Follow-ups due" value={kpis.followups} />
        <Kpi label="Scheduled" value={buckets.scheduled.length} />
      </div>

      <Section title="Overdue" alert={buckets.overdue.length > 0 ? 'needs attention' : null} tasks={buckets.overdue} onOpen={open} />
      <Section title="Due today" tasks={buckets.due} onOpen={open} />
      <Section title="Follow-ups due today" tasks={buckets.followups} showStatus onOpen={open} />
      <Section title="Scheduled" tasks={buckets.scheduled} onOpen={open} />
    </>
  );
}

interface SectionProps {
  title: string;
  tasks: TaskDto[];
  showStatus?: boolean;
  alert?: string | null;
  onOpen?: (task: TaskRowModel) => void;
}

function Section({ title, tasks, showStatus = false, alert, onOpen }: SectionProps) {
  if (tasks.length === 0) return null;
  return (
    <div className={styles.section}>
      <SectionHead title={title} count={tasks.length} alert={alert ?? null} />
      {tasks.map((task) =>
        onOpen ? (
          <TaskRow
            key={task.id}
            task={toRowModel(task)}
            showStatus={showStatus}
            onOpen={onOpen}
          />
        ) : (
          <TaskRow key={task.id} task={toRowModel(task)} showStatus={showStatus} />
        ),
      )}
    </div>
  );
}

interface KpiProps {
  label: string;
  value: number;
  critical?: boolean;
  meta?: string | null;
  metaAlert?: boolean;
}

function Kpi({ label, value, critical = false, meta, metaAlert = false }: KpiProps) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={`${styles.kpiValue} ${critical ? styles.kpiCritical : ''}`}>{value}</div>
      {meta && <div className={`${styles.kpiMeta} ${metaAlert ? styles.kpiAlert : ''}`}>{meta}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bucketing + formatting
// ---------------------------------------------------------------------------

interface Buckets {
  overdue: TaskDto[];
  due: TaskDto[];
  followups: TaskDto[];
  scheduled: TaskDto[];
}

function bucket(tasks: TaskDto[]): Buckets {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const overdue: TaskDto[] = [];
  const due: TaskDto[] = [];
  const followups: TaskDto[] = [];
  const scheduled: TaskDto[] = [];

  for (const t of tasks) {
    if (t.status === 'waiting' || t.status === 'delegated') {
      followups.push(t);
      continue;
    }
    const dueAt = t.dueAt ? Date.parse(t.dueAt) : null;
    const schedAt = t.scheduledAt ? Date.parse(t.scheduledAt) : null;
    if (dueAt && dueAt < startOfToday.getTime()) {
      overdue.push(t);
      continue;
    }
    if (dueAt && dueAt <= endOfToday.getTime()) {
      due.push(t);
      continue;
    }
    if (schedAt && schedAt <= endOfToday.getTime()) {
      scheduled.push(t);
      continue;
    }
  }
  return { overdue, due, followups, scheduled };
}

function toRowModel(t: TaskDto): TaskRowModel {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    done: t.status === 'done',
    dateLabel: chooseDateLabel(t),
    dateState: chooseDateState(t),
    waitingSince: null,
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
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (ms < start.getTime()) return 'overdue';
  if (ms <= end.getTime()) return 'today';
  return 'normal';
}

function formatShortDate(d: Date): string {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateline(d: Date): string {
  return d
    .toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(',', ' ·');
}
