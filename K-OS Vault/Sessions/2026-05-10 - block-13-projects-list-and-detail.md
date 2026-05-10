---
type: session
date: 2026-05-10
duration: ~50m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-13
  - ui
  - projects
  - archive
---

# Block 13 — Projects list + detail

> [!success] Outcome in one line
> The first detail screen ships with the structured archive flow ("out of sight, not gone") and live-computed progress. The shared `<ArchiveModal>` will also serve Areas in Block 14.

## Outcomes

- ✅ **`api/projects.ts`** — DTOs + hooks: `useProjects(archived)`, `useProject(id)`, `useProjectPeople(id)`, `useProjectTasks(id)`, `useArchiveProject()`, `useRestoreProject()`. `computeProgress(tasks)` returns `{ total, done, open, overdue, ratio }` per the schema's "Project progress" view (live, never stored).
- ✅ **`components/ArchiveModal.tsx` + `.module.css`** — reusable across project / area. Reason picker (`completed / dropped / paused / replaced`) + optional note textarea. Click-outside dismisses; the confirm button is disabled until a reason is picked. Copy ("Out of sight, not gone…") matches the design's archive iterations.
- ✅ **`screens/Projects.tsx` + CSS** — card grid, active / archived sub-tab toggle. Each card links to `/projects/:id`. Empty states differ for active vs archived.
- ✅ **`screens/ProjectDetail.tsx`** — header (name + outcome), action buttons (Archive / Restore), archived-banner showing reason + note, live progress bar, linked-people pill row, scrollable task list. Archived projects show the banner; restoration clears the four archive fields together.
- ✅ **Routes** — `/projects/` (index) + `/projects/$id`. The `routeTree.gen.ts` was extended in the same shape TanStack would have generated, with the parent-relative `id`/`path`/`fullPath` for both.

### Verification

- ✅ `pnpm --filter web typecheck` — green.
- ⏳ Live exercise (create project → see in active tab → archive with "completed" reason → see in archived tab → restore → back in active).

## Decisions made

- **Tasks under a project use `/api/tasks?project_id=:id`**: not a dedicated endpoint. The Block 6 list filter already supports it; one less route to maintain.
- **Progress is computed in JS, not server-side**: matches schema doc Q3. The numbers are derived from the same tasks the screen already fetches; one network round-trip total.
- **Archive modal is shared**: same component will mount in `AreaDetail` (Block 14). Both entities use `ARCHIVE_REASONS` from the schema enum.
- **No "delete forever" button yet** for archived projects. The plan mentioned it — defer to Block 16 / settings polish; archive is the primary path and a hard delete is destructive enough that the UI should ask twice.
- **No project-create form in this block**. Creation will happen via Quick Capture / triage paths or via a dedicated form in Block 16's polish round. Listing + viewing + lifecycle was the deliverable.

## Decisions deferred

- **Milestones**: prototype mentions them; schema has no `milestones` table. Honest gap; defer until a structured ask lands.
- **Project status / target date editing inline**: read-only here. Block 16 brings the right-rail picker pattern that flips them.
- **Click-through to task detail from the project's task list**: pending Block 16's `/tasks/:id` route.

## Next steps

Block 14 — **Areas list + detail**. Same shape as projects (list + detail + archive flow) plus the review action and a few areas-specific affordances (cadence, last/next review, recurring tasks pulled out separately, agent-suggestions placeholder).

## Notes & context

- **The route-tree hand-edit pattern is settling**: each block adds 2-3 routes; the Vite plugin owns the file at runtime; the manual extension is just keeping the typechecker happy. Once we ship `pnpm dev` is the canonical regenerator.
- **Block 12's "projects without next action" placeholder** could now be wired (we have `useProjects` + `useProjectTasks`), but doing it well needs a per-project query fan-out that's better as a server endpoint. Defer until that endpoint lands.
