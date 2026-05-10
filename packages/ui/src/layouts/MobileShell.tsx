/**
 * MobileShell — header + scrollable content + bottom tab bar.
 *
 * Used by the host on `mobile` viewport. The host owns the actual <Link>
 * elements (TanStack Router stays out of @k-os/ui), so the tab bar
 * exposes a `tabs` prop and a `renderTab` callback identical in spirit to
 * Sidebar's `renderItem`.
 */

import { Icon, type IconName } from '../components/Icon';
import styles from './MobileShell.module.css';

export interface MobileTab {
  id: string;
  label: string;
  icon: IconName;
  /** When set, tapping the tab triggers `onCapture` rather than navigation. */
  capture?: boolean;
}

export interface MobileTabRenderProps {
  className: string;
  children: React.ReactNode;
}

export interface MobileShellProps {
  title: React.ReactNode;
  topbarActions?: React.ReactNode;
  children: React.ReactNode;
  tabs: readonly MobileTab[];
  activeId?: string | null;
  onCapture?: () => void;
  /** Render the host's <Link> for navigation tabs. The capture tab is rendered
   *  internally as a button calling `onCapture`. */
  renderTab: (tab: MobileTab, props: MobileTabRenderProps) => React.ReactNode;
}

export function MobileShell({
  title,
  topbarActions,
  children,
  tabs,
  activeId,
  onCapture,
  renderTab,
}: MobileShellProps) {
  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <h1 className={styles.topbarTitle}>{title}</h1>
        {topbarActions && <div className={styles.topbarActions}>{topbarActions}</div>}
      </header>

      <div className={styles.content}>{children}</div>

      <nav className={styles.tabbar} aria-label="Primary">
        {tabs.map((tab) => {
          if (tab.capture) {
            return (
              <button
                key={tab.id}
                type="button"
                className={styles.tab}
                aria-label={tab.label}
                onClick={() => onCapture?.()}
              >
                <span className={styles.captureBtn}>
                  <Icon name={tab.icon} size={20} />
                </span>
                <span className={styles.captureLabel}>{tab.label}</span>
              </button>
            );
          }
          const active = tab.id === activeId;
          const className = `${styles.tab} ${active ? styles.tabActive : ''}`;
          return (
            <span key={tab.id}>
              {renderTab(tab, {
                className,
                children: (
                  <>
                    <span className={styles.iconWrap}>
                      <Icon name={tab.icon} size={18} />
                    </span>
                    <span>{tab.label}</span>
                  </>
                ),
              })}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
