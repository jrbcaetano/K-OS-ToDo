---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - frontend
  - framework
---

# 0002 — First app: Vite + React + TypeScript

## Context

The first K-OS app (`apps/web`) hosts the shell + the Tasks module, with future modules layered as route groups. Constraints:

- The Project North Star design is built as **React JSX prototypes** (`primitives.jsx`, `screens.jsx`, `pickers.jsx`).
- Heavy client-side state, rich keyboard interactions, dense UI updates — this is an **app**, not a content site.
- **No SEO needs** — single-user productivity tool, gated behind auth.
- Must compile to a static bundle deployable on Vercel; the Hono API runs separately as serverless functions (see [[0009 - api-hono-on-vercel-serverless]]).
- TypeScript end-to-end.

## Decision

- **React 18+** with **TypeScript** for the UI
- **Vite** as the build tool / dev server
- App lives at `apps/web/` in the monorepo
- Routes are **namespaced** (`/tasks/...`, future `/planner/...`, `/knowledge/...`) so additional modules don't require new Vite apps

## Alternatives considered

- **Next.js** — Industry default; gives SSR, RSC, file-based routing, and API routes in one. **Rejected** because: K-OS is app-shaped, not content-shaped — RSC and SSR add complexity for no SEO win; the API runs better as a separate Hono app under `packages/api`; Next.js's dev-build complexity is overhead we don't need.
- **SvelteKit** — Smaller, faster, less boilerplate. **Rejected** because: the design is already React JSX; ecosystem (TanStack, shadcn, headless component libs) is unmatched in React; second-mover risk on framework choice when the team is one person.
- **Solid** — Fastest runtime, JSX-compatible. **Rejected** because: smallest ecosystem of the four; the perf advantage isn't material at our scale.
- **Remix** — Strong data-loading story. **Rejected** because: data-loading model (route loaders) overlaps with TanStack Query, doubling primitives; API routes are co-located in a way that fights our `packages/api` separation.
- **Just plain create-react-app or webpack** — slower dev, no real reason to choose over Vite in 2026.

## Consequences

- **Positive**:
  - Lightweight setup; near-instant HMR
  - Direct port of `primitives.jsx` and `screens.jsx` to `.tsx`
  - Vite's plugin ecosystem (PWA, env, image optimisation) is mature
- **Negative**:
  - No file-system routing built in — addressed by [[0006 - routing-tanstack-router]]  - No built-in API layer — addressed by [[0009 - api-hono-on-vercel-serverless]]- **Neutral**:
  - SPA routing means initial paint is gated on JS download; with auth-gated app this is fine

## References

- [[0001 - monorepo-with-pnpm-and-turborepo]]
- [[0006 - routing-tanstack-router]]- [[0009 - api-hono-on-vercel-serverless]]- design/project-north-start/project/screens.jsx (in repo)
- [Vite docs](https://vitejs.dev/)
