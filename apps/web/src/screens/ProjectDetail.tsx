/**
 * Project detail.
 *
 * Reads /projects/:id, /projects/:id/people, and /tasks?project_id=:id.
 * Progress is computed live from the task list (per schema doc Q3).
 *
 * Archive flow uses the shared `<ArchiveModal>`. Restore is a single click.
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Avatar, SectionHead, TaskRow } from '@k-os/ui';
import {
  computeProgress,
  useArchiveProject,
  useProject,
  useProjectPeople,
  useProjectTasks,
  useRestoreProject,
} from '../api/projects';
import { ArchiveModal } from '../components/ArchiveModal';
import { toRowModel } from './_task-row';
import styles from './Projects.module.css';

export function ProjectDetail() {
  const { id } = useParams({ from: '/projects/$id' });
  const project = useProject(id);
  const people = useProjectPeople(id);
  const tasks = useProjectTasks(id);
  const archive = useArchiveProject();
  const restore = useRestoreProject();
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (project.isLoading) return <div>Loading…</div>;
  if (project.isError || !project.data) return <div>Couldn’t load project.</div>;

  const p = project.data.project;
  const taskList = tasks.data?.tasks ?? [];
  const progress = computeProgress(taskList);
  const peopleList = people.data?.people ?? [];
  const isArchived = !!p.archivedAt;

  return (
    <>
      <div className={styles.detailHead}>
        <div>
          <h2 className={styles.detailName}>{p.name}</h2>
          <p className={styles.detailOutcome}>{p.outcome}</p>
        </div>
        <div className={styles.detailActions}>
          {isArchived ? (
            <button
              type="button"
              className={styles.btn}
              onClick={() => restore.mutate(p.id)}
              disabled={restore.isPending}
            >
              {restore.isPending ? 'Restoring…' : 'Restore'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.btn}
              onClick={() => setArchiveOpen(true)}
            >
              Archive…
            </button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className={styles.archivedBanner}>
          Archived — reason: <strong>{p.archiveReason ?? '—'}</strong>
          {p.archiveNote && <> · “{p.archiveNote}”</>}
        </div>
      )}

      <div className={styles.progressRow}>
        <span>
          {progress.done}/{progress.total} done · {progress.overdue} overdue
        </span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress.ratio * 100}%` }} />
        </div>
      </div>

      {peopleList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            People
          </span>
          {peopleList.map((p) => (
            <span key={p.personId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Avatar person={{ initials: p.initials, color: p.color }} size={18} />
              <span style={{ fontSize: 12 }}>{p.name}</span>
              {p.role && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>· {p.role}</span>}
            </span>
          ))}
        </div>
      )}

      {taskList.length === 0 ? (
        <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>No tasks under this project yet.</div>
      ) : (
        <div>
          <SectionHead title="Tasks" count={taskList.length} />
          {taskList.map((t) => (
            <TaskRow key={t.id} task={toRowModel(t)} showStatus showProject={false} />
          ))}
        </div>
      )}

      <ArchiveModal
        open={archiveOpen}
        entityKind="project"
        entityName={p.name}
        onClose={() => setArchiveOpen(false)}
        onConfirm={({ reason, note }) =>
          archive.mutate(
            { id: p.id, reason, note },
            { onSuccess: () => setArchiveOpen(false) },
          )
        }
        pending={archive.isPending}
      />
    </>
  );
}
