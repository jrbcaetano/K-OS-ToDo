---
type: session
date: 2026-05-10
duration: ~70m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-16
  - ui
  - tasks
  - pickers
  - radix
---

# Block 16 — Task detail + inline pickers

> [!success] Outcome in one line
> The task detail screen ships with click-to-edit title and description, a 9-row right rail of Radix-Popover pickers (Status / Priority / Due / Scheduled / Review / Project / Area / Context / Person), a scroll-capped activity log, and a comments thread that POSTs `kind='commented'` events. Phase 5 closes.

## Outcomes

### API addition

- ✅ **`packages/api/src/routes/tasks.ts`** — `POST /tasks/:id/comment` accepts `{ body: string (1..4000) }` and inserts a `task_events` row with `kind='commented'`, `payload: { body }`. Workspace-scoped check before insert; returns the created event.

### Hooks

- ✅ **`apps/web/src/api/tasks.ts`** — `useTask`, `usePatchTask`, `useCompleteTask`, `useCommentOnTask`. The patch hook invalidates `['task', id]`, `['tasks']`, and `['inbox']` so list screens refresh after a field change.
- ✅ **`apps/web/src/api/catalog.ts`** — `useContexts` + `useTags` for picker data.

### Screens

- ✅ **`screens/TaskDetail.tsx` + `.module.css`** — two-column layout (main + 280px right rail).
  - Title is click-to-edit (Enter saves, Esc cancels).
  - Description block click-to-edit, ⌘↵ saves, Esc cancels.
  - "Mark complete" button posts `/complete` (the row already had a checkbox in the lists; this is the explicit detail-screen action).
  - Right rail: 9 picker rows wrapped in `<Popover.Root>`. Each row is `label · value`; click opens the picker; pick PATCHes the task and closes the popover. `RecordPicker`-style rows (Project / Area / Context / Person) include a search input + a "None" entry to clear the field.
  - Activity log: 240px max-height scroll cap, last 50 events; `describeEvent` formats each event kind into a one-liner. Events render `field_edited` payloads as `field: from → to`.
  - Comments thread: a single text input + "Post" button; submits via `useCommentOnTask`.
- ✅ **`screens/_use-open-task.ts`** — `useOpenTask()` returns a `(task) => navigate('/tasks/$id')` helper. Today wires it; the other list screens can pick it up incrementally.
- ✅ **`screens/Today.tsx`** — passes `onOpen={open}` to each `TaskRow` so list rows now navigate to detail. Other list screens (Upcoming, Waiting, Review, Projects/Areas detail, People) still no-op on row click; one-line edit each when polish lands.

### Routes

- ✅ **`routes/tasks/$id.tsx`** + extended `routeTree.gen.ts`. Twelve total file routes registered.

### Verification

- ✅ `pnpm -r typecheck` — green across all six packages + `apps/web`.

## Decisions made

- **Pickers stay in `apps/web` for this block** rather than graduating to `@k-os/ui/components/pickers/`. Reason: the pickers are tightly bound to TaskDetail's PATCH semantics; promoting them would mean inventing a generic shape before we know how Block 14's area picker (or future workspace pickers) want to differ. ADR 0004's plan for `@k-os/ui` pickers stays the goal; this block earns the first concrete callsite.
- **Native `<input type="date">`** for date pickers: zero-dependency, browser-native UX, accessible by default. The prototype's calendar widget can land later if the user wants quick-presets.
- **Tags are read-only on the right rail** for now. Adding/removing tags needs a multi-select picker, which is the natural next layer once `tag` create/delete from the rail is wired (deferred).
- **Click-to-edit instead of inline always-editing** for title and description: matches the prototype's "calm by default" feel. The empty-description path shows `Click to add a description…` italic-grey placeholder.
- **Activity describer is a switch-statement on `kind`**: simple, exhaustive, no missing fall-through. Adding a new event kind is one new case.
- **`useOpenTask` is a hook, not an inline lambda**: small wrapper but it consolidates the route shape so when `/tasks/$id` ever changes, only this file needs editing.
- **Conditional prop spread for `onOpen`**: TaskRow's prop is `onOpen?: (t) => void`. With `exactOptionalPropertyTypes: true`, passing `onOpen={undefined}` is rejected. The clean fix is the conditional render in `Section`; the alternative would have been widening TaskRow's type to `(t) => void | undefined`, which leaks the optionality down a level we don't want.

## Decisions deferred

- **Owner picker**: Owner uses the same Person picker, but we don't surface it on the right rail yet because there's no `/api/me` to pre-fill the default. Adding once the auth UI lands.
- **Tags add/remove**: see above.
- **Source picker**: read-only chip showing `sourceKind` if set; editing it is rare.
- **Activity pagination**: the cap is 50 events from `useTask`; `/tasks/:id/events` supports `?limit&before` cursors. Add a "View all" expand or a separate `/tasks/$id/activity` route when a power user asks.
- **Click-through on Upcoming / Waiting / Review / Projects / Areas / People**: intentionally not wired in this block to keep the diff small. One-line edit per file when next polishing.
- **Pickers in `@k-os/ui`**: graduate after Block 14's area / Block 15's people screens have a second use site.

## Next steps

Phase 5 closes. **Phase 6** opens with **Block 17 — Mobile responsive layouts** (responsive shell + mobile bottom-tab bar + sheet-style task detail), then **Block 18 — AI integration + recurring + PWA polish + launch**.

## Notes & context

- **Largest UI block by far** — ~580 LOC in `TaskDetail.tsx` alone. Most of it is the picker scaffolding; the actual data plumbing is small. The volume comes from N pickers × (label + state + popover content + onPick) — exactly why a generic `<RecordPicker>` in `@k-os/ui` will pay off the moment a second screen needs the same shape.
- **The activity log is the first place the user sees the audit work** from Block 6 paying off. Every PATCH the right rail issues now shows up as a `field_edited` row in the log within the same render.
- **`onOpen` isn't yet a deep-link**: TanStack Router's history covers back/forward; the URL is the only state. Marking `useTask` with a sane staleTime (10s) keeps the round-trip fast on revisit.
