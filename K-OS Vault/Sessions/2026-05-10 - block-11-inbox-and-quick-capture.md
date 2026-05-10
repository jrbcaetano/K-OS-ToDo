---
type: session
date: 2026-05-10
duration: ~50m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-11
  - ui
  - inbox
  - quick-capture
  - keyboard
---

# Block 11 — Inbox + Quick Capture

> [!success] Outcome in one line
> ⌘K opens a Quick Capture modal that POSTs to `/api/inbox/capture`; the Inbox screen presents one item at a time with N/S/W/D/Z keyboard shortcuts that triage straight to the API.

## Goal

Ship the keyboard-first capture and triage flow per the prototype. AI parse stays a no-op until Block 18.

## Outcomes

### Hooks (`apps/web/src/api/inbox.ts`)

- ✅ `useInbox()` — `['inbox']` query, 10s stale.
- ✅ `useCapture()` — POST `/inbox/capture`; on success invalidates `['inbox']` and `['tasks']`.
- ✅ `useTriage()` — POST `/inbox/:id/triage`; same invalidations. Body accepts the full triage payload (status + optional accepted suggestions).
- ✅ `useDiscardInbox()` — POST `/inbox/:id/discard`.

### Inbox screen (`apps/web/src/screens/Inbox.tsx`)

- ✅ Single-item triage card: source line, title, optional description body, and a row of action buttons. Empty state reads "Inbox zero. Capture with ⌘K."
- ✅ Keyboard map: `N/S/W/D` triage (next / scheduled / waiting / delegated), `Z` discard, `J`/`↓` next item, `K`/`↑` previous. Bypasses when focus is in an input/textarea/contentEditable so typing in Quick Capture doesn't fire shortcuts.
- ✅ Index resets when the list shrinks past the cursor.

### Quick Capture (`apps/web/src/components/QuickCapture.tsx`)

- ✅ Overlay + 640px modal. Click outside to close. ⌘K (global) opens it; Esc closes.
- ✅ Title input + multi-line description input. `Enter` saves from the title; `⌘+Enter` saves from the description.
- ✅ Slash menu: typing `/` opens a kind picker (Status / Priority / Due / Scheduled / Person / Project / Area / Context). ↑↓ navigate, Enter/Tab pick. Selecting a kind rewrites `/<query>` → `/<kind>:` and repositions the caret so the user can type the value. The structured-value resolution (turn `/person:andy` into a real personId chip) is deferred to Block 16 where the entity pickers land — capture today still works without it: the slash markers are saved as part of the title and the user can refine in triage.
- ✅ AI parse hook stays a no-op per Block 7 — `sourceKind: 'manual'` on every capture; `aiParsed = null` server-side.

### Wiring

- ✅ `apps/web/src/routes/inbox.tsx` — TanStack file route mounting `<InboxScreen />`.
- ✅ `apps/web/src/routes/__root.tsx` — global ⌘K listener; mounts `<QuickCapture>` outside `<AppShell>` so the overlay covers the whole viewport. Topbar gains a "Quick add ⌘K" button as a discoverable trigger.
- ✅ `apps/web/src/routeTree.gen.ts` — hand-extended to include `/inbox` (the Vite plugin regenerates this on `pnpm dev` / `pnpm build`; hand-editing here is a typecheck-only stop-gap for headless development).

### Verification

- ✅ `pnpm -r typecheck` — green across the workspace.
- ⏳ Live exercise (capture an item via ⌘K → it shows up on `/inbox` → press `N` → inbox count drops, `/today` shows the new task) deferred to a manual `pnpm dev` round.

## Decisions made

- **Slash menu is kind-only for now**: per the prototype, the menu should also search records (people, projects, areas, timelines). That's a substantial picker investment we'll make once in Block 16 (task detail's entity pickers). Until then, the slash marker survives in the title text so capture isn't blocked, and triage can backfill the structured fields. Documented in the `QuickCapture.tsx` docstring.
- **Modal close on overlay mousedown**: more responsive than waiting for click. Doesn't interfere with text selection inside the modal because we `stopPropagation` on the modal's mousedown.
- **Enter saves only when the slash menu is closed**: the menu intercepts Enter for picking a kind. This matches the prototype's pattern.
- **Triage handlers don't auto-advance**: once the React Query invalidation fires the list refetches and the card re-renders with the new item at the same index. Keeping the index stationary feels right — the user is reading items in order, not stepping through.
- **Keyboard shortcuts skip when focus is in an editable element**: avoids the classic "typing 'next year' in a textarea triggers triage" trap.
- **Capture sets `sourceKind: 'manual'`**: Block 18 may set it dynamically based on integration source.

## Decisions deferred

- **Cross-record slash search**: see above; lands in Block 16 alongside the entity pickers.
- **AI suggestion chips on the inbox card**: the prototype shows "Suggested · Status · Waiting" pills under the body. The data isn't wired (no AI parse yet); when Block 18 ships `ai_parsed`, the card renders the pills and the triage button accepts them.
- **`onOpenTask` from inbox**: the inbox card doesn't link to task detail; that lives on the Today/Upcoming list flows. Add when Block 16's `/tasks/:id` route exists.
- **Auto-advance toggle**: a "press enter to triage as 'next' and advance to the next item" mode. Power-user feature; ship later if the user asks.

## Next steps

Block 12 — **Upcoming, Waiting, Review screens**. The three "future / loose-end" views. The `/api/tasks/upcoming` and `/api/tasks/waiting` endpoints already exist; Review is composed from existing endpoints (stale waiting + projects without next action + people with open loops + areas due for review). Reuse `TaskRow` + `SectionHead` from Block 8.

## Notes & context

- **Routing tree maintenance**: hand-editing `routeTree.gen.ts` between dev runs is slightly hacky but it's the smallest possible workflow that keeps `pnpm typecheck` green without dropping the dev server. The Vite plugin overwrites the file as soon as `pnpm dev` runs, so the file is essentially a working draft that converges on truth.
- **Two ways into Quick Capture** (⌘K and the topbar button) is intentional — the keyboard path is for muscle memory, the button is for first-time users.
