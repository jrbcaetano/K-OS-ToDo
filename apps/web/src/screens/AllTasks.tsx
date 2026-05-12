/**
 * All tasks.
 *
 * A flat, sortable list of every task in the workspace. The scope filter
 * controls what "every" means:
 *
 *   - Open (default): active, undone. The working backlog.
 *   - All:            includes archived and done. Useful for searching.
 *   - Done:           completed but not archived.
 *   - Archived:       soft-deleted.
 *
 * Tasks are sorted by due date ascending with NULLs last (handled server-
 * side), so the most time-sensitive things float to the top and undated
 * tasks settle at the bottom.
 */

import { useState } from 'react';
import { SectionHead, TaskRow } from '@k-os/ui';
import { useTasksAll, type TasksScope } from '../api/tasks';
import { useOpenTask } from './_use-open-task';
import { toRowModel } from './_task-row';
import styles from './Lists.module.css';

interface ScopeOption {
  id: TasksScope;
  label: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
  { id: 'done', label: 'Done' },
  { id: 'archived', label: 'Archived' },
];

const SCOPE_BLURBS: Record<TasksScope, string> = {
  open: 'Active backlog — everything still to do.',
  all: 'Every task in the workspace, including completed and archived.',
  done: 'Completed tasks (not archived).',
  archived: 'Archived tasks — kept for history.',
};

export function AllTasksScreen() {
  const [scope, setScope] = useState<TasksScope>('open');
  const query = useTasksAll(scope);
  const open = useOpenTask();

  const tasks = query.data?.tasks ?? [];

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>All tasks</h2>
        <div className={styles.sub}>{SCOPE_BLURBS[scope]}</div>
      </div>

      <div className="kos-filterbar">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`kos-filter-chip ${
              scope === opt.id ? 'kos-filter-chip-active' : ''
            }`}
            onClick={() => setScope(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {query.isLoading && <div className={styles.loading}>Loading…</div>}
      {query.isError && (
        <div className={styles.error}>Couldn’t load tasks.</div>
      )}

      {!query.isLoading && !query.isError && tasks.length === 0 && (
        <div className={styles.empty}>
          {scope === 'open'
            ? 'Nothing on your plate — enjoy the calm.'
            : 'No tasks in this view.'}
        </div>
      )}

      {tasks.length > 0 && (
        <div className={styles.section}>
          <SectionHead
            title="Sorted by due date"
            count={tasks.length}
            alert={
              scope === 'open' || scope === 'all'
                ? 'undated tasks at the bottom'
                : null
            }
          />
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={toRowModel(task)}
              showStatus
              onOpen={open}
            />
          ))}
        </div>
      )}
    </>
  );
}
