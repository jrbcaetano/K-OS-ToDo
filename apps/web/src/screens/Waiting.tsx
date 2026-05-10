/**
 * Waiting screen.
 *
 * Reads /api/tasks/waiting (status in waiting/delegated). Buckets:
 *   - Stale (review_at < today - 7d, or no review_at + waiting_since > 7d)
 *   - Due today (review_at within today)
 *   - Upcoming (review_at > today)
 */

import { SectionHead, TaskRow } from '@k-os/ui';
import { useTasksWaiting } from '../api/tasks';
import type { TaskDto } from '../api/tasks';
import { toRowModel } from './_task-row';
import styles from './Lists.module.css';

const STALE_THRESHOLD_DAYS = 7;

export function WaitingScreen() {
  const query = useTasksWaiting();

  if (query.isLoading) return <div className={styles.loading}>Loading…</div>;
  if (query.isError) return <div className={styles.error}>Couldn’t load waiting.</div>;

  const tasks = query.data?.tasks ?? [];
  const { stale, dueToday, upcoming } = bucket(tasks);
  const total = tasks.length;

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>Waiting · Follow-ups</h2>
        <div className={styles.sub}>
          {total} open · {stale.length} stale · {dueToday.length} due today
        </div>
      </div>

      <Section title="Stale" tasks={stale} alert={stale.length > 0 ? 'needs nudge' : null} />
      <Section title="Due today" tasks={dueToday} />
      <Section title="Upcoming" tasks={upcoming} />

      {total === 0 && <div className={styles.empty}>No open follow-ups.</div>}
    </>
  );
}

function Section({
  title,
  tasks,
  alert,
}: {
  title: string;
  tasks: TaskDto[];
  alert?: string | null;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className={styles.section}>
      <SectionHead title={title} count={tasks.length} alert={alert ?? null} />
      {tasks.map((task) => (
        <TaskRow key={task.id} task={toRowModel(task, { showWaitingSince: true })} showStatus />
      ))}
    </div>
  );
}

function bucket(tasks: TaskDto[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const staleCutoff = start.getTime() - STALE_THRESHOLD_DAYS * 86_400_000;

  const stale: TaskDto[] = [];
  const dueToday: TaskDto[] = [];
  const upcoming: TaskDto[] = [];

  for (const t of tasks) {
    const review = t.reviewAt ? Date.parse(t.reviewAt) : null;
    if (review === null) {
      // No review_at — fall back to created_at age for stale check.
      const createdMs = Date.parse(t.createdAt);
      if (createdMs < staleCutoff) stale.push(t);
      else upcoming.push(t);
      continue;
    }
    if (review < staleCutoff) stale.push(t);
    else if (review <= end.getTime()) dueToday.push(t);
    else upcoming.push(t);
  }
  return { stale, dueToday, upcoming };
}
