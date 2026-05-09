/**
 * StatusChip — small status pill with a coloured square swatch.
 * Status colours come from `tokens.css` (--status-*).
 */

import styles from './StatusChip.module.css';

export type TaskStatus =
  | 'inbox'
  | 'next'
  | 'scheduled'
  | 'waiting'
  | 'delegated'
  | 'blocked'
  | 'someday'
  | 'done';

const LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  next: 'Next',
  scheduled: 'Scheduled',
  waiting: 'Waiting',
  delegated: 'Delegated',
  blocked: 'Blocked',
  someday: 'Someday',
  done: 'Done',
};

export interface StatusChipProps {
  status: TaskStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  return <span className={`${styles.status} ${styles[status]}`}>{LABELS[status]}</span>;
}
