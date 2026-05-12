/**
 * Settings shell.
 *
 * A reusable two-pane layout: secondary nav on the left grouped by area
 * (Platform / Workspace / Profile), and the current sub-page on the right.
 * Sub-pages register as child routes under /settings/* and the Outlet
 * here renders whichever one matches.
 *
 * The Platform group is only listed for users whose session carries
 * platformRole='admin' — the server gates the endpoints anyway, but
 * hiding the entries keeps non-admins from seeing menu items they can't
 * use.
 */

import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { useSession } from '../api/auth-hooks';
import styles from './settings.module.css';

export const Route = createFileRoute('/settings')({
  component: SettingsShell,
  beforeLoad: ({ location }) => {
    // /settings on its own redirects to the first page the user can see —
    // platform approvals for admins, profile for everyone else. The session
    // hook is the source of truth; we can't access it in beforeLoad cleanly,
    // so the component handles the empty case (renders a placeholder) and
    // the user clicks into a section themselves on first visit.
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      throw redirect({ to: '/settings/profile' });
    }
  },
});

interface SettingsLink {
  to: string;
  label: string;
}
interface SettingsGroup {
  label: string;
  links: SettingsLink[];
}

function SettingsShell() {
  const session = useSession();
  const user = session.data?.user;
  const isAdmin = user?.platformRole === 'admin';
  const { location } = useRouterState();

  const groups: SettingsGroup[] = [];
  if (isAdmin) {
    groups.push({
      label: 'Platform',
      links: [
        { to: '/settings/platform/approvals', label: 'Registration Pending Approval' },
      ],
    });
  }
  groups.push({
    label: 'K-OS ToDos',
    links: [{ to: '/settings/todos', label: 'Workspace settings' }],
  });
  groups.push({
    label: 'Profile',
    links: [{ to: '/settings/profile', label: 'Profile settings' }],
  });

  return (
    <div className={styles.shell}>
      <aside className={styles.nav} aria-label="Settings sections">
        <h1 className={styles.heading}>Settings</h1>
        {groups.map((group) => (
          <div className={styles.group} key={group.label}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.links.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`${styles.link} ${active ? styles.linkActive : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
