---
type: session
date: 2026-05-10
duration: ~40m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-12
  - ui
  - upcoming
  - waiting
  - review
---

# Block 12 — Upcoming, Waiting, Review screens

> [!success] Outcome in one line
> Three more screens shipped against the data layer; Phase 4 is now complete.

## Goal

Implement the three "future / loose-end" views described in the plan, sharing the Block 8 primitives and the Block 6 task list endpoints.

## Outcomes

### Hooks

- ✅ **`useTasksUpcoming()` / `useTasksWaiting()`** — added to `apps/web/src/api/tasks.ts`. Same shape and stale-time as `useTasksToday`.
- ✅ **`useAreas(archived)`** — `apps/web/src/api/areas.ts`. Returns the area list; the Review screen filters client-side for "due now" rows.

### Screens

- ✅ **`screens/_task-row.ts`** — shared `toRowModel(task, opts)` that adapts a `TaskDto` to a `TaskRowModel`. Options include `showWaitingSince` for the meta row. Date helpers (`startOfToday`, `endOfToday`, `formatShortDate`) co-located so the screens don't each reinvent them.
- ✅ **`screens/Upcoming.tsx`** — `tomorrow / this week / next week / later` buckets. Empty buckets drop their `<SectionHead>`; nothing scheduled at all renders an "Nothing scheduled" line.
- ✅ **`screens/Waiting.tsx`** — `Stale (review_at < today − 7d, or no review_at + created_at > 7d) / Due today / Upcoming`. The "stale" alert label calls out a nudge action that's deferred to Block 16. Tasks render with `showStatus` and `showWaitingSince`.
- ✅ **`screens/Review.tsx`** — four-card grid:
  1. **Stale waiting** — count + link to Waiting + the actual list under the cards.
  2. **Areas due for review** — `next_review_at <= now` filter on `useAreas()`.
  3. **Projects without a next action** — placeholder card with explicit "wires up with the Projects detail screen" message. Block 13 will add the computed query.
  4. **People with open loops** — same shape, deferred to Block 15.
- ✅ **`screens/Lists.module.css`** — shared CSS module for the three list screens; review-card grid lives here too.

### Wiring

- ✅ **Routes**: `routes/upcoming.tsx`, `routes/waiting.tsx`, `routes/review.tsx`. The route tree (`apps/web/src/routeTree.gen.ts`) is hand-extended to register all five known routes (Index, Inbox, Upcoming, Waiting, Review).

### Verification

- ✅ `pnpm --filter web typecheck` — green.
- ⏳ Live exercise (drop tasks into each bucket, confirm they appear) deferred to a manual `pnpm dev` run.

## Decisions made

- **Stale threshold = 7 days**: matches the prototype's intent ("waiting for a week" feels stale). Living constant in both `Waiting.tsx` and `Review.tsx` for now; could be promoted to `@k-os/core` later if it earns a third use site.
- **Review's two missing surfaces stay as labelled placeholders** rather than empty-state cards. The user gets honest feedback ("this lights up with Block 13/15") instead of a misleading "0 projects" reading. Removes the temptation to ship the screens with broken counts.
- **Areas due for review are derived client-side** — the API already exposes `nextReviewAt`. A dedicated `/areas/due-for-review` endpoint would be cheaper if the area list grew to thousands; at MVP the workspace's area set is small enough that filtering in JS is fine.
- **Today's `toRowModel` is intentionally not refactored** to use the new `_task-row.ts` helper. The scopes are identical but Today has subtle behaviour around buckets that's better left untouched — a future refactor can consolidate once all screens stabilize.
- **No empty-state component yet**: each screen does its own minimal "Nothing scheduled" / "No open follow-ups" line. A shared `<EmptyState>` earns its keep when 4+ screens want it; we're at 3.

## Decisions deferred

- **Project / People review surfaces**: Block 13 (Projects) wires "without next action"; Block 15 (People) wires open-loop counts.
- **Inline triage / nudge from the Waiting list**: a "Nudge" button on each row would post a comment-event without changing status. Defer to Block 16 where the comment UI lands.
- **Click-through to task detail from any list row**: still pending Block 16's `/tasks/:id` route. The TaskRow primitive accepts `onOpen` — wiring it is one line per screen once the route exists.
- **`Today.tsx` ↔ `_task-row.ts` consolidation**: noted above.

## Next steps

Block 13 — **Projects list + detail**. The card grid + per-project detail with archive flow. Project progress is computed live from tasks (per schema doc Q3 — never stored).

## Notes & context

- **Five screens are now real**, all backed by the same shell (Block 9) and primitives (Block 8). The visual language is consistent because every list collapses to `SectionHead + TaskRow` pairs.
- **Phase 4 closes** at Block 12. Blocks 13–16 are detail screens (Projects, Areas, People, Tasks) — most of the remaining UI investment.
