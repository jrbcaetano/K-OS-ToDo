/**
 * Review screen.
 *
 * Four surfaces per the plan:
 *   1. Stale waiting       — reuses /tasks/waiting + the same threshold as Waiting screen.
 *   2. Areas due for review — /areas with next_review_at <= now.
 *   3. Projects without a next action — placeholder (Block 13 wires the
 *      computed query as part of the Projects detail block).
 *   4. People with open loops — placeholder (Block 15).
 *
 * The placeholders are honest about the gap rather than rendering empty
 * cards — the user knows when each surface is wired.
 */

import { Link } from '@tanstack/react-router';
import { SectionHead, TaskRow } from '@k-os/ui';
import { useTasksWaiting, type TaskDto } from '../api/tasks';
import { useAreas } from '../api/areas';
import { toRowModel } from './_task-row';
import styles from './Lists.module.css';

const STALE_THRESHOLD_DAYS = 7;

export function ReviewScreen() {
  const waiting = useTasksWaiting();
  const areas = useAreas();

  const staleWaiting = filterStale(waiting.data?.tasks ?? []);
  const areasDue = (areas.data?.areas ?? []).filter((a) => {
    if (!a.nextReviewAt) return false;
    return Date.parse(a.nextReviewAt) <= Date.now();
  });

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>Review</h2>
        <div className={styles.sub}>Loose ends and recurring health checks.</div>
      </div>

      <div className={styles.reviewGrid}>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardLabel}>Stale waiting</div>
          <div className={styles.reviewCardValue}>{staleWaiting.length}</div>
          <div className={styles.reviewCardSub}>
            No update in {STALE_THRESHOLD_DAYS}+ days. <Link to="/waiting">Open Waiting →</Link>
          </div>
        </div>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardLabel}>Areas due for review</div>
          <div className={styles.reviewCardValue}>{areasDue.length}</div>
          <div className={styles.reviewCardSub}>
            {areasDue.length === 0
              ? 'All caught up.'
              : areasDue.map((a) => a.name).join(' · ')}
          </div>
        </div>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardLabel}>Projects without a next action</div>
          <div className={styles.reviewCardValue}>—</div>
          <div className={styles.reviewCardSub}>
            Wires up with the Projects detail screen.
          </div>
        </div>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardLabel}>People with open loops</div>
          <div className={styles.reviewCardValue}>—</div>
          <div className={styles.reviewCardSub}>
            Wires up with the People detail screen.
          </div>
        </div>
      </div>

      {staleWaiting.length > 0 && (
        <div className={styles.section}>
          <SectionHead title="Stale waiting" count={staleWaiting.length} />
          {staleWaiting.map((t) => (
            <TaskRow
              key={t.id}
              task={toRowModel(t, { showWaitingSince: true })}
              showStatus
            />
          ))}
        </div>
      )}
    </>
  );
}

function filterStale(tasks: TaskDto[]): TaskDto[] {
  const cutoff = Date.now() - STALE_THRESHOLD_DAYS * 86_400_000;
  return tasks.filter((t) => {
    const review = t.reviewAt ? Date.parse(t.reviewAt) : null;
    if (review === null) {
      return Date.parse(t.createdAt) < cutoff;
    }
    return review < cutoff;
  });
}
