import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { AppShell, Sidebar, TweaksPanel, Icon } from '@k-os/ui';
import type { SidebarItemRenderProps } from '@k-os/ui';
import { NAV_GROUPS, type NavItem } from '@k-os/core';

export const Route = createRootRoute({
  component: RootLayout,
});

const TITLES: Record<string, string> = {
  today: 'Today',
  inbox: 'Inbox',
  upcoming: 'Upcoming',
  waiting: 'Waiting · Follow-ups',
  projects: 'Projects',
  areas: 'Areas',
  people: 'People',
  review: 'Review',
};

const DEMO_USER = {
  name: 'Joao Cardoso',
  initials: 'JC',
  meta: 'Boxfusion · Praesto PT',
};

function renderItem(item: NavItem, props: SidebarItemRenderProps) {
  return (
    <Link to={item.path} className={props.className}>
      {props.children}
    </Link>
  );
}

function RootLayout() {
  const { location } = useRouterState();
  const activeId =
    NAV_GROUPS.flatMap((g) => g.items).find((i) =>
      i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path),
    )?.id ?? 'today';

  const title = TITLES[activeId] ?? 'K-OS';

  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={NAV_GROUPS}
          activeId={activeId}
          renderItem={renderItem}
          user={DEMO_USER}
          versionLabel="v0.1"
        />
      }
      title={title}
      topbarActions={
        <>
          <button
            type="button"
            aria-label="Search"
            style={{
              height: 28,
              minWidth: 28,
              padding: '0 8px',
              borderRadius: 'var(--radius)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink-3)',
              fontSize: 12,
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <Icon name="search" size={13} />
          </button>
          <TweaksPanel />
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}
