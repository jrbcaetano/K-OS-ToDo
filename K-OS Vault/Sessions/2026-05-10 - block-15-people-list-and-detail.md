---
type: session
date: 2026-05-10
duration: ~30m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-15
  - ui
  - people
---

# Block 15 — People list + detail

> [!success] Outcome in one line
> The split-pane People view ships: list on the left, selected person's open loops + KPIs on the right; deep-linkable via `/people/:id`.

## Outcomes

- ✅ **`api/people.ts`** — `usePeople`, `usePerson`, `usePersonTasks`. The "open loops" count is computed client-side from the task list (status not in `done` and not archived).
- ✅ **`screens/People.tsx` + `.module.css`** — split layout. Both `/people` and `/people/$id` mount the same component; the second branch passes `selectedId` and shows the detail pane. Selecting a row navigates via TanStack `useNavigate` so deep links work.
- ✅ Detail pane: avatar + name + role header, three-KPI row (Open loops / Waiting on them / Last seen), tasks list, "Topics for next conversation" placeholder card (Block 18 wires the AI suggestions), and a link to `/waiting`.
- ✅ **Routes** `/people/` + `/people/$id`; route tree extended.

### Verification

- ✅ `pnpm --filter web typecheck` — green.

## Decisions made

- **`/me` deferred**: the prototype's "they owe you / you owe them" split needs the current user id to compare against `task.owner_id`. We don't have a `/me` endpoint yet (it's an obvious follow-on but out of scope). For now the detail pane shows a single "Open loops" total + "Waiting on them" derived from `status in ('waiting','delegated')` — the latter is a reasonable proxy until owner-aware UI lands.
- **Both /people routes mount `PeopleSplit`**: simpler than maintaining a parent layout. The Vite plugin's actual generation might use a layout route; the hand-edit converges with it on next dev run.
- **No archive flow yet**: people support archive in the API but the screen doesn't expose it. Defer until polish; not user-facing critical.
- **Topics-for-next-conversation card** sits where the AI suggestions will go; same shape as the Areas screen's placeholder.

## Decisions deferred

- **`/api/me`** to surface the current user id and enable the owner-vs-stakeholder split.
- **Project / area links from the person detail**: a "shared work" section showing where the person is linked (project_people / area_people). Add when the dashboards earn it.
- **Last seen / next meeting editing**: read-only here.

## Next steps

Block 16 — **Task detail + inline pickers**. The densest UI block — every right-rail field is a picker. Builds reusable picker components in `@k-os/ui`.

## Notes & context

- **Five detail screens shipped** (Today/Inbox/Upcoming/Waiting/Review × the data flow + Projects + Areas + People). Block 16 closes Phase 5 with the task detail.
