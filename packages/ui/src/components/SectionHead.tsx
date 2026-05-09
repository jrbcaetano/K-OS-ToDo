/**
 * SectionHead — uppercase label + optional count, alert, and action slot.
 * Used at the top of every Today / Upcoming / Waiting / Project section.
 */

import styles from './SectionHead.module.css';

export interface SectionHeadProps {
  title: string;
  count?: number | null;
  alert?: string | null;
  action?: React.ReactNode;
}

export function SectionHead({ title, count, alert, action }: SectionHeadProps) {
  return (
    <div className={styles.head}>
      <span className={styles.title}>{title}</span>
      {count != null && <span className={styles.count}>{count}</span>}
      {alert && <span className={styles.alert}>{alert}</span>}
      {action && <span className={styles.action}>{action}</span>}
    </div>
  );
}
