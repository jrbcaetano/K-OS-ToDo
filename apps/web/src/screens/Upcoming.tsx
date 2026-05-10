/**
 * Upcoming screen.
 *
 * Reads /api/tasks/upcoming (next 30 days, scheduled or next-status with a
 * scheduled_at). Buckets into Tomorrow / This week / Next week / Later
 * client-side.
 */

import { SectionHead, TaskRow } from '@k-os/ui';
import { useTasksUpcoming } from '../api/tasks';
import type { TaskDto } from '../api/tasks';
import { toRowModel } from './_task-row';
import styles from './Lists.module.css';

interface Buckets {
  tomorrow: TaskDto[];
  thisWeek: TaskDto[];
  nextWeek: TaskDto[];
  later: TaskDto[];
}

export function UpcomingScreen() {
  const query = useTasksUpcoming();

  if (query.isLoading) return <div className={styles.loading}>Loading…</div>;
  if (query.isError) return <div className={styles.error}>Couldn’t load upcoming.</div>;

  const tasks = query.data?.tasks ?? [];
  const buckets = bucket(tasks);
  const total = tasks.length;

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>Upcoming</h2>
        <div className={styles.sub}>
          {total} task{total === 1 ? '' : 's'} scheduled in the next 30 days.
        </div>
      </div>

      <Section title="Tomorrow" tasks={buckets.tomorrow} />
      <Section title="This week" tasks={buckets.thisWeek} />
      <Section title="Next week" tasks={buckets.nextWeek} />
      <Section title="Later" tasks={buckets.later} />

      {total === 0 && <div className={styles.empty}>Nothing scheduled.</div>}
    </>
  );
}

function Section({ title, tasks }: { title: string; tasks: TaskDto[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className={styles.section}>
      <SectionHead title={title} count={tasks.length} />
      {tasks.map((task) => (
        <TaskRow key={task.id} task={toRowModel(task)} />
      ))}
    </div>
  );
}

function bucket(tasks: TaskDto[]): Buckets {
  const now = new Date();
  const startOfTomorrow = startOfDay(addDays(now, 1));
  const startOfNextWeek = startOfDay(addDays(startOfWeek(now), 7));
  const startOfWeekAfter = startOfDay(addDays(startOfNextWeek, 7));

  const out: Buckets = { tomorrow: [], thisWeek: [], nextWeek: [], later: [] };
  for (const t of tasks) {
    const at = t.scheduledAt ? Date.parse(t.scheduledAt) : null;
    if (!at) continue;
    if (sameDay(new Date(at), startOfTomorrow)) {
      out.tomorrow.push(t);
    } else if (at < startOfNextWeek.getTime()) {
      out.thisWeek.push(t);
    } else if (at < startOfWeekAfter.getTime()) {
      out.nextWeek.push(t);
    } else {
      out.later.push(t);
    }
  }
  return out;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const dow = c.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  c.setDate(c.getDate() + offset);
  return c;
}
function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
