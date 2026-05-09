/**
 * TaskRow — the workhorse list-row primitive.
 *
 * Composes the smaller chips (Status / Ctx / Person / Date / PriorityDot)
 * and exposes click handlers for opening the task and toggling completion.
 * Caller passes a `TaskRowModel` shape — we don't bind it directly to the
 * Drizzle row type because list screens routinely project fewer fields and
 * decorate with computed values (e.g. `dateLabel`, `dateState`).
 */

import { CtxBadge } from './CtxBadge';
import { DateChip, type DateChipState } from './DateChip';
import { PersonChip } from './PersonChip';
import { PriorityDot, type TaskPriority } from './PriorityDot';
import { StatusChip, type TaskStatus } from './StatusChip';
import styles from './TaskRow.module.css';

export interface TaskRowModel {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  done?: boolean;
  context?: { label: string; color: string } | null;
  projectName?: string | null;
  person?: { name: string; initials: string; color?: string | null } | null;
  dateLabel?: string | null;
  dateState?: DateChipState;
  /** Optional waiting-since label like "3d" — rendered in the meta row. */
  waitingSince?: string | null;
}

export interface TaskRowProps {
  task: TaskRowModel;
  onOpen?: (task: TaskRowModel) => void;
  onComplete?: (task: TaskRowModel) => void;
  showProject?: boolean;
  showStatus?: boolean;
}

export function TaskRow({
  task,
  onOpen,
  onComplete,
  showProject = true,
  showStatus = false,
}: TaskRowProps) {
  const checkboxClass = [
    styles.checkbox,
    task.priority === 'critical' && styles.checkboxCritical,
    task.priority === 'important' && styles.checkboxImportant,
    task.done && styles.checkboxChecked,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={`${styles.row} ${task.done ? styles.done : ''}`}
      onClick={() => onOpen?.(task)}
    >
      <span
        role={onComplete ? 'button' : undefined}
        aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'}
        tabIndex={onComplete ? 0 : undefined}
        className={checkboxClass}
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.(task);
        }}
      />
      <div className={styles.body}>
        <div className={styles.title}>{task.title}</div>
        <div className={styles.meta}>
          {showStatus && (
            <>
              <StatusChip status={task.status} />
              <span className={styles.sep}>·</span>
            </>
          )}
          {task.context && (
            <CtxBadge label={task.context.label} color={task.context.color} />
          )}
          {showProject && task.projectName && (
            <>
              <span className={styles.sep}>·</span>
              <span className={styles.projChip}>{task.projectName}</span>
            </>
          )}
          {task.waitingSince && (
            <>
              <span className={styles.sep}>·</span>
              <span>waiting {task.waitingSince}</span>
            </>
          )}
        </div>
      </div>
      <div className={styles.right}>
        {task.person && <PersonChip person={task.person} />}
        {task.dateLabel && (
          <DateChip label={task.dateLabel} state={task.dateState ?? 'normal'} />
        )}
        <PriorityDot priority={task.priority} />
      </div>
    </button>
  );
}
