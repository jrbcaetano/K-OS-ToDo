/**
 * CtxBadge — context label with a coloured dot prefix.
 * The colour comes from the context row's `color` field; we set it as a
 * CSS custom property on the element so the `::before` swatch picks it up.
 */

import styles from './CtxBadge.module.css';

export interface CtxBadgeProps {
  label: string;
  color: string;
}

export function CtxBadge({ label, color }: CtxBadgeProps) {
  return (
    <span className={styles.badge} style={{ ['--ctx-color' as string]: color }}>
      {label}
    </span>
  );
}
