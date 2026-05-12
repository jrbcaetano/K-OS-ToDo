/**
 * User menu in the sidebar footer.
 *
 * Trigger is the user-name block; the popover lists the settings sub-areas
 * plus a visually-distinct Sign out. Platform Settings is only rendered for
 * platform admins.
 */

import { useNavigate } from '@tanstack/react-router';
import * as Popover from '@radix-ui/react-popover';
import { Icon } from '@k-os/ui';
import type { AuthUser } from '../api/auth';
import styles from './UserMenu.module.css';

export interface UserMenuProps {
  user: Pick<AuthUser, 'displayName' | 'platformRole'>;
  trigger: React.ReactNode;
  onSignOut: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  to: string;
  icon: 'settings' | 'inbox' | 'today';
}

export function UserMenu({ user, trigger, onSignOut }: UserMenuProps) {
  const navigate = useNavigate();
  const isAdmin = user.platformRole === 'admin';

  const items: MenuItem[] = [];
  if (isAdmin) {
    items.push({ id: 'platform', label: 'Platform Settings', to: '/settings/platform/approvals', icon: 'settings' });
  }
  items.push({ id: 'todos', label: 'K-OS ToDos Settings', to: '/settings/todos', icon: 'inbox' });
  items.push({ id: 'profile', label: 'Profile Settings', to: '/settings/profile', icon: 'today' });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.content}
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <div className={styles.header}>{user.displayName}</div>
          <div className={styles.list}>
            {items.map((it) => (
              <Popover.Close key={it.id} asChild>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => void navigate({ to: it.to })}
                >
                  <span className={styles.itemIcon}>
                    <Icon name={it.icon} size={13} />
                  </span>
                  <span>{it.label}</span>
                </button>
              </Popover.Close>
            ))}
          </div>
          <div className={styles.divider} />
          <Popover.Close asChild>
            <button
              type="button"
              className={`${styles.item} ${styles.signOut}`}
              onClick={onSignOut}
            >
              <span className={styles.itemIcon}>
                <SignOutIcon />
              </span>
              <span>Sign out</span>
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SignOutIcon() {
  // Inline so we don't have to add it to the shared Icon set just for this.
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
