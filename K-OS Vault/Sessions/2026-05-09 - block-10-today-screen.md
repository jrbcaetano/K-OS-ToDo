---
type: session
date: 2026-05-09
duration: ~40m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-10
  - ui
  - today
  - tanstack-query
---

# Block 10 — Today screen

> [!success] Outcome in one line
> The first end-to-end screen lands: `/api/tasks/today` → TanStack Query → bucketed sections (Overdue / Due / Followups / Scheduled) → primitives from Block 8, all rendering inside the Block 9 shell.

## Goal

Replace the placeholder home route with the real Today screen, wired to the live API. After this block the app is signing-in-and-using-it for the Today flow.

## Outcomes

### `apps/web/src/api/`

- ✅ **`client.ts`** — `apiGet<T>` and `apiSend<T>` (POST/PATCH/DELETE) wrap `fetch('/api/...', { credentials: 'include' })`. Single place that knows about the API URL prefix and the cookie shape; throws `ApiError` on non-2xx with the parsed body attached. `headers` is conditionally set so `exactOptionalPropertyTypes` accepts the call.
- ✅ **`tasks.ts`** — `TaskDto` (JSON-shape mirror of the Drizzle row, timestamps as ISO strings) plus `useTasksToday()` — a TanStack Query hook keyed `['tasks', 'today']` with a 30s `staleTime`.

### `apps/web/src/screens/Today.tsx` + `.module.css`

- ✅ **`bucket(tasks)`** — sorts the response into Overdue / Due / Followups / Scheduled. Date math lives here (start/end of today via `Date#setHours`). Followups are anything in `waiting`/`delegated`; the rest split by `dueAt < today` / `dueAt today` / `scheduledAt today`.
- ✅ **`toRowModel(task)`** — adapts `TaskDto` → `TaskRowModel`. `dateLabel` picks from `dueAt`/`scheduledAt`/`reviewAt` based on status; `dateState` is `'overdue' | 'today' | 'normal'` via the same comparison. `formatShortDate` returns "Today" / "Tomorrow" / `Mon 12 May`.
- ✅ **KPI strip** computed live from the same response (Due / Overdue / Follow-ups / Scheduled counts). Critical-priority count surfaces as the "Due today" meta line.
- ✅ **Sections** use `<SectionHead>` + `<TaskRow>` from `@k-os/ui`. Empty buckets are dropped (no header, no empty state — matches the prototype's behaviour).

### `apps/web/src/routes/index.tsx`

- ✅ Replaced placeholder; now mounts `<TodayScreen />`.

### Verification

- ✅ `pnpm -r typecheck` — green.
- ⏳ Live verification (signup → seed a few tasks → open `/`, confirm sections render and KPIs match) deferred to a manual `pnpm dev` round.

## Decisions made

- **Client-side bucketing** (not server). The Today endpoint already filters; bucketing is a 4-way split on the same array. Doing it server-side would require either a multi-section response shape or four endpoints. Client side is one query, one render — simpler.
- **No "Focus" section yet**: the prototype shows a "Focus" pinned-tasks section first; the schema has no `pinned` flag on tasks. Skipping is the honest move; revisit with a schema amendment if the user wants it.
- **TaskDto is hand-typed in `apps/web/src/api/tasks.ts`**: not derived from Drizzle. Two reasons: (1) the API uses JSON, so timestamps are ISO strings — Drizzle types `Date`, not `string`; (2) `apps/web` doesn't depend on `@k-os/db`. The DTO is the contract between server and client.
- **TanStack Query 30s staleTime**: matches the `QueryClient` default already set in `apps/web/src/main.tsx`. Today's data doesn't change every second; this avoids a refetch storm on tab focus during dev.
- **`Section` returns null for empty buckets** rather than rendering an empty state. Matches the prototype; the screen feels calmer when nothing surfaces. A general "you're caught up" empty state can land on the bare-empty path (no buckets at all) — defer until we see the real data shape.
- **Date formatting is hand-rolled** (`Intl.DateTimeFormat` via `toLocaleDateString`): no `date-fns`/`dayjs` dependency added. The needs are tiny — Today / Tomorrow / `Mon 12 May` — and adding a date library at this scale isn't worth the bytes.

## Decisions deferred

- **Quick Add CTA + filter pill** in the page header: the prototype has them; defer to Block 11 (Quick Capture) and a future filter UI.
- **Click-through to Task detail**: `<TaskRow>` accepts `onOpen`; we don't pass it yet because the `/tasks/:id` route doesn't exist. Block 16 wires it.
- **Loading skeleton**: replaced with a "Loading…" text. A real `<TaskRowSkeleton>` is on the deferred list.
- **Mark-complete from the row**: `onComplete` plumbing not wired; needs a mutation hook + optimistic update. Block 16 (task detail) introduces both.

## Next steps

Block 11 — **Inbox + Quick Capture**. Single-item inbox triage screen + the global ⌘K modal with `/` slash menu. The capture endpoint is already in place from Block 7; the AI parse hook stays a no-op until Block 18.

## Notes & context

- **Today is the smallest possible "vertical slice"**: it touches every layer (auth middleware, Drizzle query, JSON serialisation, TanStack Query, Block 8 primitives, Block 9 shell). If anything's wrong end-to-end, it shows up here.
- **The DTO shape will recur**: every screen will declare a similar JSON-mirror type. Worth extracting a shared `apps/web/src/api/types.ts` once Block 11 / 12 land — premature now.
- **`QueryClientProvider` is already in `main.tsx`** from the scaffolding session. No changes needed there.
