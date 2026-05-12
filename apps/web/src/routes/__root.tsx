import { useEffect, useState } from 'react';
import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AppShell,
  Avatar,
  MobileShell,
  Sidebar,
  TweaksPanel,
  Icon,
  useViewport,
  type MobileTab,
  type MobileTabRenderProps,
  type SidebarItemRenderProps,
} from '@k-os/ui';
import { NAV_GROUPS, type NavItem } from '@k-os/core';
import { QuickCapture } from '../components/QuickCapture';
import { UserMenu } from '../components/UserMenu';
import { logout, type AuthUser, type AuthWorkspace } from '../api/auth';
import { useSession } from '../api/auth-hooks';
import { useCounts } from '../api/tasks';
import { ApiError } from '../api/client';

export const Route = createRootRoute({
  component: RootLayout,
});

const TITLES: Record<string, string> = {
  today: 'Today',
  inbox: 'Inbox',
  upcoming: 'Upcoming',
  waiting: 'Waiting · Follow-ups',
  all: 'All tasks',
  projects: 'Projects',
  areas: 'Areas',
  people: 'People',
  review: 'Review',
};

const MOBILE_TABS: MobileTab[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'capture', label: 'Capture', icon: 'plus', capture: true },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'more', label: 'More', icon: 'moreH' },
];

const MOBILE_TAB_PATHS: Record<string, string> = {
  today: '/',
  inbox: '/inbox',
  people: '/people',
  more: '/review',
};

const PUBLIC_PATHS = new Set(['/login', '/signup']);

function renderItem(item: NavItem, props: SidebarItemRenderProps) {
  return (
    <Link to={item.path} className={props.className}>
      {props.children}
    </Link>
  );
}

function renderTab(tab: MobileTab, props: MobileTabRenderProps) {
  const path = MOBILE_TAB_PATHS[tab.id] ?? '/';
  return (
    <Link to={path} className={props.className}>
      {props.children}
    </Link>
  );
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function buildUserMeta(user: AuthUser, workspace: AuthWorkspace | null): {
  name: string;
  initials: string;
  meta: string;
} {
  return {
    name: user.displayName,
    initials: deriveInitials(user.displayName),
    meta: workspace?.name ?? user.email,
  };
}

function todayDateMeta(): string {
  const d = new Date();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RootLayout() {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qcOpen, setQcOpen] = useState(false);
  const viewport = useViewport();
  const isMobile = viewport === 'mobile';

  const isPublic = PUBLIC_PATHS.has(location.pathname);

  const sessionQuery = useSession();
  const countsQuery = useCounts();
  const counts = countsQuery.data;

  // Map sidebar nav ids → counts + alerts from the API.
  const navCounts: Record<string, number | undefined> = {
    today: counts?.today,
    inbox: counts?.inbox,
    upcoming: counts?.upcoming,
    waiting: counts?.waiting,
    all: counts?.all,
    review: counts?.review,
    projects: counts?.projects,
    areas: counts?.areas,
    people: counts?.people,
  };
  const navAlerts: Record<string, string | undefined> = {
    today: counts && counts.todayOverdue > 0 ? String(counts.todayOverdue) : undefined,
    waiting: counts && counts.waitingStale > 0 ? String(counts.waitingStale) : undefined,
  };
  // Inbox is the only nav item we visually disable when empty — the rest are
  // pages the user might still want to open (e.g. People with zero contacts).
  const disabledNavIds = counts && counts.inbox === 0 ? ['inbox'] : [];

  // Redirect handling.
  useEffect(() => {
    if (sessionQuery.isLoading) return;
    const is401 =
      sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401;

    if (is401 && !isPublic) {
      void navigate({ to: '/login' });
    } else if (sessionQuery.data && isPublic) {
      void navigate({ to: '/' });
    }
  }, [sessionQuery.isLoading, sessionQuery.error, sessionQuery.data, isPublic, navigate]);

  // ⌘K / Ctrl-K → Quick Capture. Only meaningful when authenticated.
  useEffect(() => {
    if (!sessionQuery.data) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQcOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sessionQuery.data]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      /* fall through — we clear locally anyway */
    }
    qc.removeQueries({ queryKey: ['session'] });
    qc.clear();
    void navigate({ to: '/login' });
  }

  // Public pages (login / signup) render bare, no shell, no gating.
  if (isPublic) {
    return <Outlet />;
  }

  // While we don't know yet whether the user is authenticated, render nothing.
  if (sessionQuery.isLoading || (!sessionQuery.data && !sessionQuery.error)) {
    return <div style={{ minHeight: '100vh', background: 'var(--paper)' }} />;
  }
  if (!sessionQuery.data) {
    return <div style={{ minHeight: '100vh', background: 'var(--paper)' }} />;
  }

  const { user, workspace } = sessionQuery.data;
  const userMeta = buildUserMeta(user, workspace);

  const activeId =
    NAV_GROUPS.flatMap((g) => g.items).find((i) =>
      i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path),
    )?.id ?? 'today';

  const title = TITLES[activeId] ?? 'K-OS';
  const dateMeta = activeId === 'today' ? todayDateMeta() : null;

  if (isMobile) {
    return (
      <>
        <MobileShell
          title={title}
          topbarActions={<TweaksPanel />}
          tabs={MOBILE_TABS}
          activeId={activeId}
          onCapture={() => setQcOpen(true)}
          renderTab={renderTab}
        >
          <Outlet />
        </MobileShell>
        <QuickCapture open={qcOpen} onClose={() => setQcOpen(false)} />
      </>
    );
  }

  // Desktop sidebar topSlot: Quick add + Search (matches the prototype layout).
  const sidebarTop = (
    <>
      <button
        type="button"
        className="kos-btn kos-btn-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          marginBottom: 6,
        }}
        onClick={() => setQcOpen(true)}
      >
        <Icon name="plus" size={12} /> Quick add
        <span
          className="kos-kbd"
          style={{
            marginLeft: 'auto',
            color: 'rgba(245,243,238,0.7)',
            borderColor: 'rgba(245,243,238,0.2)',
            background: 'transparent',
          }}
        >
          ⌘K
        </span>
      </button>
      <button
        type="button"
        className="kos-nav-item"
        style={{ marginBottom: 4, width: '100%' }}
        aria-label="Search"
      >
        <span className="kos-nav-icon">
          <Icon name="search" size={14} />
        </span>
        <span>Search</span>
        <span className="kos-kbd" style={{ marginLeft: 'auto' }}>
          ⌘/
        </span>
      </button>
    </>
  );

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            groups={NAV_GROUPS}
            activeId={activeId}
            counts={navCounts}
            alerts={navAlerts}
            disabledIds={disabledNavIds}
            renderItem={renderItem}
            user={userMeta}
            versionLabel="v0.4"
            topSlot={sidebarTop}
            renderUserCard={(u) => (
              <UserMenu
                user={{ displayName: u.name, platformRole: user.platformRole ?? null }}
                onSignOut={handleLogout}
                trigger={
                  <button type="button" className="kos-user-trigger" aria-label="Open user menu">
                    <Avatar
                      person={{ initials: u.initials, color: u.color ?? null }}
                      size={22}
                    />
                    <div className="kos-user-trigger-info">
                      <div className="kos-user-trigger-name">{u.name}</div>
                      {u.meta && <div className="kos-user-trigger-meta">{u.meta}</div>}
                    </div>
                  </button>
                }
              />
            )}
          />
        }
        title={title}
        meta={dateMeta}
        topbarActions={
          <>
            <button type="button" className="kos-icon-btn" aria-label="Search">
              <Icon name="search" size={13} />
              <span className="kos-kbd">⌘/</span>
            </button>
            <button type="button" className="kos-icon-btn" aria-label="Notifications">
              <Icon name="bell" size={13} />
            </button>
            <button type="button" className="kos-icon-btn" aria-label="Agents">
              <Icon name="sparkles" size={13} />
              <span>Agents</span>
            </button>
            <TweaksPanel />
          </>
        }
      >
        <Outlet />
      </AppShell>
      <QuickCapture open={qcOpen} onClose={() => setQcOpen(false)} />
    </>
  );
}
