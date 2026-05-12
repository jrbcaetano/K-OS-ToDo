/**
 * Sidebar navigation manifest.
 *
 * One source of truth for "what nav items exist" — the Sidebar in
 * `@k-os/ui` reads this to render groups, and the routes in `apps/web`
 * keep matching `id` strings so the active state lights up correctly.
 *
 * Icon names match `IconName` in `@k-os/ui`. Counts are computed at
 * render time by the host (the manifest carries no data).
 */

export interface NavItem {
  id: string;
  name: string;
  /** Path for the route — TanStack Router target. */
  path: string;
  /** Icon name from @k-os/ui's ICON_PATHS. */
  icon: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Workspace',
    items: [
      { id: 'inbox', name: 'Inbox', path: '/inbox', icon: 'inboxAlt' },
      { id: 'today', name: 'Today', path: '/', icon: 'today' },
      { id: 'upcoming', name: 'Upcoming', path: '/upcoming', icon: 'upcoming' },
      { id: 'waiting', name: 'Waiting', path: '/waiting', icon: 'waiting' },
      { id: 'all', name: 'All tasks', path: '/all', icon: 'list' },
      { id: 'review', name: 'Review', path: '/review', icon: 'review' },
    ],
  },
  {
    group: 'Organize',
    items: [
      { id: 'projects', name: 'Projects', path: '/projects', icon: 'projects' },
      { id: 'areas', name: 'Areas', path: '/areas', icon: 'areas' },
      { id: 'people', name: 'People', path: '/people', icon: 'people' },
    ],
  },
];
