/**
 * PriorityDot — slim coloured bar indicating task priority.
 * Critical and important have visible colours; routine and low are
 * intentionally transparent so the row stays calm.
 */

import styles from './PriorityDot.module.css';

export type TaskPriority = 'critical' | 'important' | 'routine' | 'low';

const LABELS: Record<TaskPriority, string> = {
  critical: 'Critical',
  important: 'Important',
  routine: 'Routine',
  low: 'Low',
};

export interface PriorityDotProps {
  priority: TaskPriority;
}

export function PriorityDot({ priority }: PriorityDotProps) {
  return (
    <span
      className={`${styles.dot} ${styles[priority]}`}
      title={LABELS[priority]}
      aria-label={`Priority: ${LABELS[priority]}`}
    />
  );
}
