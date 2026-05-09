---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - frontend
  - routing
---

# 0006 — Routing: TanStack Router

## Context

K-OS is a SPA without file-system routing baked in (Vite, not Next.js). It needs:

- **Type-safe routes** — URLs and search params are part of the API; runtime errors from typo'd route names are unacceptable.
- **Code-splitting** by route — the app will grow as modules land (Tasks → Planner → Knowledge); shipping all of it on first paint is wasteful.
- **Nested layouts** — the K-OS shell (sidebar + top bar) wraps every module's screens; per-module shell variations later.
- **Search-param state** as first-class — Today's filter state, Inbox triage cursor, etc. should be URL-encoded so back/forward and copy-link work.

## Decision

**TanStack Router** for client routing in `apps/web`.

Routes are declared in code (not file-based, though TanStack supports both). Search params are validated with Zod at the route boundary.

## Alternatives considered

- **React Router v7** — Most-used; well-documented; v7 added strong typing. **Rejected** because: TanStack Router's typing is more comprehensive (validated search params, loader return types fully inferred); the team behind it (Tanner Linsley, same as TanStack Query) has a coherent vision; integration with TanStack Query is first-class.
- **Wouter** — Tiny (~1KB). **Rejected**: no type safety; no nested layouts; insufficient for a multi-module shell.
- **Next.js routing** — Rejected with framework choice in [[0002 - first-app-vite-react-typescript]].
- **Hash routing** — No reason to choose; we control the server.

## Consequences

- **Positive**: typed URLs end-to-end; route tree visible and refactor-friendly; loaders integrate cleanly with TanStack Query (preload data on route entry); search-params-as-state pattern stays out of UI state
- **Negative**: smaller ecosystem of examples than React Router (mitigated — docs are good)
- **Neutral**: bundle cost ~30 KB gzipped — acceptable for a daily-driver app

## References

- [[0002 - first-app-vite-react-typescript]]
- [[0005 - state-tanstack-query-and-zustand]]
- [TanStack Router](https://tanstack.com/router)
