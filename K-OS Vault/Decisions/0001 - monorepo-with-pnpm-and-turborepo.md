---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - repo
  - tooling
---

# 0001 — Monorepo with pnpm workspaces and Turborepo

## Context

K-OS is multi-module by design — Tasks, Planner, Knowledge, Health, Finance — and each module needs to be **independent but connected**. They share a design system, domain types, the data layer, auth, and the AI package. K-OS ToDo is the first module to ship, but the structure must accommodate the others without retrofitting.

Constraints:
- Solo developer; ops cost matters.
- TypeScript end-to-end; types must be share-able across modules without a publish step.
- Want to enforce module boundaries from day one (not "we'll split it later").

## Decision

Use a **monorepo** managed by:
- **pnpm workspaces** for dependency management
- **Turborepo** for task running and incremental builds with caching

Initial layout:

```
k-os/
├── apps/
│   └── web/         # K-OS shell + Tasks module
├── packages/
│   ├── ui/          # design tokens + components + screens
│   ├── core/        # shared types, enums, domain helpers
│   ├── db/          # Drizzle schema + migrations
│   ├── api/         # Hono app + route handlers
│   └── ai/          # Anthropic SDK wrappers + prompts
└── tooling/         # eslint, tsconfig, scripts
```

Additional modules become route groups in `apps/web` (e.g. `/planner/...`); only when a module needs a meaningfully different shell or build does it spin out as `apps/<module>/`.

## Alternatives considered

- **Multi-repo** (one per module + a shared lib repo) — Pro: hard isolation. Con: solo-dev coordination cost is high; shared types and CSS need to be published and versioned; cross-module refactors become painful.
- **Single Vite app, no packages** — Pro: simplest. Con: no enforced module boundaries; the "modular K-OS" promise is structural, not just visual; this would have to be undone before module #2.
- **Yarn or npm workspaces instead of pnpm** — Both viable. pnpm chosen for: faster installs, content-addressable storage (saves disk on multiple monorepos), and **strict node_modules layout** (catches phantom dependencies — packages must declare what they import).
- **Nx instead of Turborepo** — More powerful (graph-based, code generation, plugin ecosystem). Con: heavier, opinionated; Turborepo's task-caching primitive is sufficient for our scale and easier to reason about.

## Consequences

- **Positive**:
  - Clean module boundaries enforced by package layout
  - Type sharing without publishing
  - Fast incremental builds via Turbo cache (local + remote when on Vercel)
  - Adding a new module = adding a route group + components, not a new app
- **Negative**:
  - Slight tooling overhead — eslint, tsconfig, vitest configs need workspace-aware setup
  - Contributors must use pnpm (not npm/yarn); enforced via `packageManager` field in root `package.json`
- **Neutral**:
  - Monorepo size will stay small for the foreseeable future; no need for advanced tools (sparse checkout, git LFS)

## References

- [[0002 - first-app-vite-react-typescript]]
- [[K-OS Platform Vision|project_kos_vision (memory)]]
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Turborepo docs](https://turborepo.com/docs)
