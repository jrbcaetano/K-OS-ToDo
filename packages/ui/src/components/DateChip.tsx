/**
 * DateChip — formatted date with a state hint (`overdue` / `today` / default).
 * Caller passes the pre-formatted label and the state; the component is
 * presentation-only.
 */

import styles from './DateChip.module.css';

export type DateChipState = 'overdue' | 'today' | 'normal';

export interface DateChipProps {
  label: string;
  state?: DateChipState;
}

export function DateChip({ label, state = 'normal' }: DateChipProps) {
  const cls =
    state === 'overdue'
      ? `${styles.chip} ${styles.overdue}`
      : state === 'today'
        ? `${styles.chip} ${styles.today}`
        : styles.chip;
  return <span className={cls}>{label}</span>;
}
