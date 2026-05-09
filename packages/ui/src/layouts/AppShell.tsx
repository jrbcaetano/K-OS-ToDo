/**
 * AppShell — the desktop two-column layout.
 *
 * Sidebar (left) + Main (right, with topbar + scrollable content). The
 * sidebar element is supplied by the host so it can wire its own routing
 * (TanStack Router `<Link>`) into the items.
 *
 * Title and meta in the topbar are presentation only; the host decides
 * what to display per route.
 */

import styles from './AppShell.module.css';

export interface AppShellProps {
  sidebar: React.ReactNode;
  /** Topbar title, e.g. "Today" or "Projects". */
  title: React.ReactNode;
  /** Optional small meta line next to the title (e.g. "Thu 7 May 2026"). */
  meta?: React.ReactNode;
  /** Right-aligned topbar slot for actions (search, notifications, tweaks). */
  topbarActions?: React.ReactNode;
  /** Page content. The shell already provides scroll + max-width. */
  children: React.ReactNode;
}

export function AppShell({ sidebar, title, meta, topbarActions, children }: AppShellProps) {
  return (
    <div className={styles.app}>
      {sidebar}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.topbarTitle}>{title}</h1>
          {meta && <span className={styles.topbarMeta}>{meta}</span>}
          {topbarActions && <div className={styles.topbarActions}>{topbarActions}</div>}
        </header>
        <div className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </div>
      </main>
    </div>
  );
}
