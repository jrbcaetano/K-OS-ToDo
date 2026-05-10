---
type: session
date: 2026-05-10
duration: ~30m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-14
  - ui
  - areas
  - review
---

# Block 14 — Areas list + detail

> [!success] Outcome in one line
> Areas mirror the Projects list/detail shape with the added review action and an italic "standard" treatment, plus a placeholder agent-suggestions card slot ready for Block 18.

## Outcomes

- ✅ **`api/areas.ts`** — extended with `useArea`, `useAreaPeople`, `useAreaTasks`, `useArchiveArea`, `useRestoreArea`, `useReviewArea`. The `useReviewArea` mutation accepts an optional `nextReviewAt` (server defaults to +7 days when absent).
- ✅ **`screens/Areas.tsx`** — card grid + active/archived sub-tabs, reusing `Projects.module.css` for visual consistency. The standard renders in italic; cadence + next-review-date show in the meta row.
- ✅ **`screens/AreaDetail.tsx`** — header with italic standard quote, cadence + last/next review, "Mark reviewed" + Archive/Restore buttons. People list, agent-suggestions placeholder card (dashed border, "Wires up in Block 18"), and the open-task list split into `Open tasks` + `Recurring` sections (recurring rows get a dashed-left-border treatment to match the prototype's "dashed-checkbox" affordance).
- ✅ **Routes** — `/areas/` + `/areas/$id`. Route-tree extended.

### Verification

- ✅ `pnpm --filter web typecheck` — green.

## Decisions made

- **Recurring detection by `scheduledAt` proxy**: the schema's true recurring marker is `parent_recurring_id` (an instance) or `recurring_rule` (a template). The `TaskDto` doesn't surface either yet — for now we use `scheduledAt != null` as a stand-in. When the DTO surfaces those fields (low-effort follow-up), the filter tightens.
- **Italic standard styling lives inline**: a one-line style on the standard quote rather than a new CSS class. If a third screen wants the same treatment, extract.
- **Reuses `Projects.module.css`**: list cards and detail header share the visuals; reuse beats duplication.
- **Mark-reviewed sends no body**: server defaults `nextReviewAt` to +7 days. A future picker (Block 16-ish) will let the user pick an explicit next date.

## Decisions deferred

- **`recurring_rule` / `parent_recurring_id` on TaskDto**: surfaces correctly on tasks that need it; revisit when Block 16 reads them for the detail view.
- **Agent-suggestions card content**: shape lands in Block 18 alongside `agentSuggestions`.

## Next steps

Block 15 — **People list + detail** (split layout, "owes you / you owe them / topics" sections). Following the same pattern.

## Notes & context

- **The pattern for detail screens has stabilised**: header + lifecycle actions + linked-people row + scoped task list. Block 15 (People) follows the same skeleton; Block 16 (Task detail) will be the densest and last.
