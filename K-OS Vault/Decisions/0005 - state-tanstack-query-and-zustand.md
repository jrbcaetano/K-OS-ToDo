---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - frontend
  - state
---

# 0005 — State: TanStack Query (server) + Zustand (UI)

## Context

The K-OS web app has two distinct kinds of state:

- **Server state** — tasks, projects, areas, people, inbox items. Lives in Postgres, fetched via the API, needs caching, background revalidation, optimistic updates, and offline tolerance. Source of truth is the server.
- **UI state** — selected task, sidebar collapsed/expanded, currently-open modal, theme/density tweaks, draft-edit buffers. Lives in the browser only. Small, local, often ephemeral.

These have fundamentally different requirements. Treating them with one tool (e.g. putting server data in Zustand or fetching in a Redux thunk) reliably produces tangled state and stale-data bugs.

## Decision

- **TanStack Query** for server state (queries + mutations + invalidation + optimistic updates + offline persistence)
- **Zustand** for UI state (small slices, no boilerplate, hooks-first)
- **No Redux**

State boundary rule: anything that came from the API is in TanStack Query; anything else is in Zustand or local component state.

## Alternatives considered

- **Redux + Redux Toolkit Query** — Capable but overweight; Redux's boilerplate is a tax with diminishing returns at this scale.
- **Jotai** instead of Zustand — Atom-oriented; nice but Zustand's store-based model is simpler to reason about for K-OS's needs (a few coarse stores: UI, tweaks panel, capture).
- **React Context only** — Doesn't scale; coarse re-renders on every change.
- **SWR** instead of TanStack Query — Smaller; works fine; TanStack Query has richer mutation/optimistic-update primitives and a larger ecosystem (devtools, persisters).
- **Recoil** — Effectively unmaintained.

## Consequences

- **Positive**: clean conceptual split; minimal boilerplate; TanStack Query handles offline persistence (important for the PWA); Zustand stays tiny and ergonomic
- **Negative**: two libraries instead of one — minor learning curve for someone new to either
- **Neutral**: TanStack Query's persistence layer (LocalStorage/IndexedDB) handles the offline-tolerance plan from [[0007 - mobile-responsive-pwa-capacitor-deferred]] without an additional sync layer at MVP

## References

- [[0002 - first-app-vite-react-typescript]]
- [[0007 - mobile-responsive-pwa-capacitor-deferred]]
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)
