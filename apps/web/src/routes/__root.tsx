import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  // The K-OS shell (sidebar + main + optional right rail) goes here once
  // ported from design/project-north-start/project/screens.jsx. For
  // scaffolding it's just the Outlet so routes render.
  return <Outlet />;
}
