/**
 * Sidebar — 232px (220px in compact density) navigation column.
 *
 * Reads the navigation manifest from `@k-os/core/navigation`. The host
 * passes the active route id and a `renderItem` callback so the actual
 * link element (`<Link>` from TanStack Router, `<a>`, `<button>`, etc.)
 * is the host's choice — keeps this package framework-agnostic.
 */

import { Icon, type IconName } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import type { NavGroup, NavItem } from '@k-os/core';
import styles from './Sidebar.module.css';

export interface SidebarUser {
  name: string;
  initials: string;
  meta?: string | null;
  color?: string | null;
}

export interface SidebarProps {
  groups: readonly NavGroup[];
  /** id of the currently active item — see NAV_GROUPS in @k-os/core. */
  activeId?: string | null;
  /** Per-item count badge, keyed by id. */
  counts?: Record<string, number | undefined>;
  /** Per-item alert label, keyed by id (e.g. "2"). */
  alerts?: Record<string, string | undefined>;
  /**
   * Render a single item's outer element. The host returns a `<Link>` /
   * `<a>` / `<button>` of its choice. Children are pre-built (icon + name
   * + optional count); the host only owns the outer `data-active` element.
   */
  renderItem: (item: NavItem, props: SidebarItemRenderProps) => React.ReactNode;
  user?: SidebarUser | null;
  versionLabel?: string;
  /** Slot below the brand for a primary CTA (Quick Add) and Search. */
  topSlot?: React.ReactNode;
  /** Slot at the right end of the footer (e.g. settings icon). */
  footerSlot?: React.ReactNode;
}

export interface SidebarItemRenderProps {
  className: string;
  children: React.ReactNode;
}

export function Sidebar({
  groups,
  activeId,
  counts,
  alerts,
  renderItem,
  user,
  versionLabel,
  topSlot,
  footerSlot,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden />
        <span className={styles.brandName}>ToDo</span>
        {versionLabel && <span className={styles.brandSub}>{versionLabel}</span>}
      </div>

      {topSlot}

      {groups.map((group) => (
        <div className={styles.section} key={group.group}>
          <div className={styles.sectionLabel}>{group.group}</div>
          {group.items.map((item) => {
            const active = item.id === activeId;
            const className = `${styles.item} ${active ? styles.itemActive : ''}`;
            const count = counts?.[item.id];
            const alert = alerts?.[item.id];
            return (
              <div key={item.id}>
                {renderItem(item, {
                  className,
                  children: (
                    <>
                      <span className={styles.icon}>
                        <Icon name={item.icon as IconName} size={14} />
                      </span>
                      <span>{item.name}</span>
                      {(count != null || alert) && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            color: alert ? 'var(--pri-critical)' : 'var(--ink-4)',
                          }}
                        >
                          {alert ? `${alert}·${count ?? 0}` : count}
                        </span>
                      )}
                    </>
                  ),
                })}
              </div>
            );
          })}
        </div>
      ))}

      {user && (
        <div className={styles.footer}>
          <Avatar
            person={{
              initials: user.initials,
              color: user.color ?? null,
            }}
            size={22}
          />
          <div className={styles.footerInfo}>
            <div className={styles.footerName}>{user.name}</div>
            {user.meta && <div className={styles.footerMeta}>{user.meta}</div>}
          </div>
          {footerSlot}
        </div>
      )}
    </aside>
  );
}
