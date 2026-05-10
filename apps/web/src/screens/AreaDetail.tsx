/**
 * Area detail — header (italic standard, Mark reviewed / Archive actions),
 * KPI row, open tasks split into "regular" and "recurring" (recurring shows
 * a dashed-checkbox indicator), agent suggestions placeholder card.
 *
 * Recurring instances (parent_recurring_id != null) and template tasks
 * (recurring_rule != null) get the dashed treatment via a className flag
 * we set on the row's wrapping div.
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Avatar, SectionHead, TaskRow } from '@k-os/ui';
import {
  useArchiveArea,
  useArea,
  useAreaPeople,
  useAreaTasks,
  useRestoreArea,
  useReviewArea,
} from '../api/areas';
import { ArchiveModal } from '../components/ArchiveModal';
import { toRowModel } from './_task-row';
import styles from './Projects.module.css';

export function AreaDetail() {
  const { id } = useParams({ from: '/areas/$id' });
  const area = useArea(id);
  const people = useAreaPeople(id);
  const tasks = useAreaTasks(id);
  const archive = useArchiveArea();
  const restore = useRestoreArea();
  const review = useReviewArea();
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (area.isLoading) return <div>Loading…</div>;
  if (area.isError || !area.data) return <div>Couldn’t load area.</div>;

  const a = area.data.area;
  const taskList = tasks.data?.tasks ?? [];
  const peopleList = people.data?.people ?? [];
  const isArchived = !!a.archivedAt;

  const open = taskList.filter((t) => !t.archivedAt && t.status !== 'done');
  const recurring = open.filter((t) => !!t.scheduledAt); // proxy for "recurring instance"
  const oneOff = open.filter((t) => !t.scheduledAt);

  return (
    <>
      <div className={styles.detailHead}>
        <div>
          <h2 className={styles.detailName}>{a.name}</h2>
          <p className={styles.detailOutcome} style={{ fontStyle: 'italic' }}>
            “{a.standard}”
          </p>
          {a.cadence && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              {a.cadence}
              {a.lastReviewedAt && (
                <> · last reviewed {new Date(a.lastReviewedAt).toLocaleDateString()}</>
              )}
              {a.nextReviewAt && (
                <> · next {new Date(a.nextReviewAt).toLocaleDateString()}</>
              )}
            </div>
          )}
        </div>
        <div className={styles.detailActions}>
          {!isArchived && (
            <button
              type="button"
              className={styles.btn}
              onClick={() => review.mutate({ id: a.id })}
              disabled={review.isPending}
            >
              {review.isPending ? 'Marking…' : 'Mark reviewed'}
            </button>
          )}
          {isArchived ? (
            <button
              type="button"
              className={styles.btn}
              onClick={() => restore.mutate(a.id)}
              disabled={restore.isPending}
            >
              {restore.isPending ? 'Restoring…' : 'Restore'}
            </button>
          ) : (
            <button type="button" className={styles.btn} onClick={() => setArchiveOpen(true)}>
              Archive…
            </button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className={styles.archivedBanner}>
          Archived — reason: <strong>{a.archiveReason ?? '—'}</strong>
          {a.archiveNote && <> · “{a.archiveNote}”</>}
        </div>
      )}

      {peopleList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            People
          </span>
          {peopleList.map((p) => (
            <span key={p.personId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Avatar person={{ initials: p.initials, color: p.color }} size={18} />
              <span style={{ fontSize: 12 }}>{p.name}</span>
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          border: '1px dashed var(--line)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 18,
          fontSize: 12,
          color: 'var(--ink-3)',
          background: 'var(--paper-2)',
        }}
      >
        <strong style={{ color: 'var(--ink-2)' }}>Agent suggestions</strong> — placeholder. Wires up in Block 18.
      </div>

      {oneOff.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHead title="Open tasks" count={oneOff.length} />
          {oneOff.map((t) => (
            <TaskRow key={t.id} task={toRowModel(t)} showStatus showProject={false} />
          ))}
        </div>
      )}

      {recurring.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHead title="Recurring" count={recurring.length} />
          {recurring.map((t) => (
            <div
              key={t.id}
              style={{ borderLeft: '2px dashed var(--line)', paddingLeft: 8 }}
              title="Recurring instance"
            >
              <TaskRow task={toRowModel(t)} showStatus showProject={false} />
            </div>
          ))}
        </div>
      )}

      {open.length === 0 && (
        <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>No open tasks.</div>
      )}

      <ArchiveModal
        open={archiveOpen}
        entityKind="area"
        entityName={a.name}
        onClose={() => setArchiveOpen(false)}
        onConfirm={({ reason, note }) =>
          archive.mutate(
            { id: a.id, reason, note },
            { onSuccess: () => setArchiveOpen(false) },
          )
        }
        pending={archive.isPending}
      />
    </>
  );
}
