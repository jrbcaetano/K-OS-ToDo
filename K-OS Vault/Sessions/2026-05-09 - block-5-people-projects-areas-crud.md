---
type: session
date: 2026-05-09
duration: ~45m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-5
  - data-layer
  - people
  - projects
  - areas
---

# Block 5 — People + Projects + Areas CRUD

> [!success] Outcome in one line
> Three of the four "first-class" entity routes are now real: people, projects, and areas all have full CRUD plus the archive lifecycle (with structured reason + note for projects/areas). Junction-table writes for `project_people` / `area_people` ship as `/:id/people` sub-resources.

## Goal

Replace three more route stubs with the full CRUD + archive shape per `docs/schema.md`. Each entity is workspace-scoped, soft-deleted via `archived_at`, and (for projects/areas) carries the structured archive metadata.

## Outcomes

### New shared helper

- ✅ **`routes/_helpers.ts`** — `stripUndefined<T>()` returns a `Defined<T>` (still partial, but values can't be `undefined`). The first version had the wrong return type (`Partial<T>` reintroduces `undefined`); the fixed shape uses `Exclude<T[K], undefined>` so `null` survives (we need it for nullable PATCH'es) but `undefined` is gone. Now used by every PATCH route.

### Routes

- ✅ **`routes/contexts.ts`** (refactor) — switched to `stripUndefined` for the PATCH path; deletes the verbose per-key reassignment from Block 4.
- ✅ **`routes/people.ts`** — full CRUD + archive/restore. `archived` query param flips between active and archived lists. People archive has no reason/note (only projects/areas do — matches schema). Initials normalised to upper-case on insert. `created_by` stamped from `c.get('user').id`.
- ✅ **`routes/projects.ts`** — full CRUD + archive/restore + `/:id/people` junction. Archive route requires `{ reason: ARCHIVE_REASONS, note?: string|null }` and stamps `archived_by`. Restore clears `archived_at`, `archive_reason`, `archive_note`, `archived_by` together. The active/archived split happens via `?archived=true`. Project progress is **NOT** stored — Block 6's `active_tasks` view + a future `project_progress` view computes it live (per schema doc Q3).
- ✅ **`routes/areas.ts`** — same CRUD/archive shape as projects, plus `POST /:id/review`. The review action stamps `last_reviewed_at = now()` and bumps `next_review_at`. Cadence is free-form text per the schema, so we accept an explicit `nextReviewAt` (ISO datetime) in the body; if absent we default to `+7 days`. Block 14 (Areas detail UI) will provide a structured picker so the API receives an explicit value every time.
- ✅ Junction sub-resources (`/:id/people` on both projects and areas) use `onConflictDoUpdate` so re-linking updates the role rather than failing on duplicate. Workspace check on both project/area AND person before writing — prevents cross-workspace contamination.

### Verification

- ✅ `pnpm --filter @k-os/api typecheck` — green.
- ⏳ Live verification (create person → create project → link them → archive project → archive list shows it; review an area → timestamps update) deferred to integration.

## Decisions made

- **Junction shape `/:id/people`** rather than top-level `/project_people`: matches REST nesting and lets the link routes share path-prefix middleware (workspace + project ownership check happens once).
- **`onConflictDoUpdate` on link writes**: a re-link request is the natural way to *change* the role on an existing link without a separate PATCH route. Keeps the API surface small.
- **Restore clears all four archive fields together** (`archived_at`, `archive_reason`, `archive_note`, `archived_by`): a restored project shouldn't carry a stale "completed" reason. Atomic in one UPDATE.
- **Areas review default of `+7 days`**: matches the most common cadence in the design (`Reviewed weekly`) and gives a sensible behavior when the body omits `nextReviewAt`. The "right" answer is structured cadence parsing; deferred to Block 14 where the UI controls the input.
- **`Defined<T>` over `NonNullable<T>`**: we need to allow `null` through `stripUndefined` because nullable columns (e.g. `contextId`, `archiveReason`) can be PATCH'd to NULL explicitly. `Exclude<T[K], undefined>` is the precise filter.
- **Soft archives keep tasks queryable**: per schema Q4, archived projects don't cascade-delete tasks. The active-vs-archived split happens at the *list* layer (this block) and the *view* layer (Block 6's `active_tasks`).

## Decisions deferred

- **Cascade behavior when archiving a project that has open tasks**: the schema FK is `set null` on `tasks.project_id`, so an archived project's tasks become "orphan" tasks (still visible, just unlinked). The design doesn't yet specify whether the user should be prompted; defer until Block 13 (Projects UI) when we know what the archive modal asks.
- **Project progress aggregation endpoint**: `GET /projects/:id/progress` doesn't exist yet — Block 13 will add it once `active_tasks` view + tasks routes are in.
- **Junction-table list endpoints on People** (`/:id/projects`, `/:id/areas`): nice-to-have for the People detail screen; defer until Block 15.

## Next steps

Block 6 — **Tasks CRUD + activity log**. The largest data-layer block: every task mutation emits a structured event, and the `active_tasks` view + filter endpoints (`/today`, `/upcoming`, `/waiting`) all land here. The `diffAuditedFields` helper in `@k-os/core/audit.ts` is the shape `field_edited` events follow.

## Notes & context

- **The `_helpers.ts` `Defined<T>` pattern is now load-bearing** for every PATCH route. Future entity routes copy the contexts/people/projects shape; the helper module is the place to add anything that earns 3+ callsites.
- **All domain routes typed `Hono<{ Variables: AuthVariables }>`** — `c.get('user')`, `c.get('workspace')` are reachable everywhere a session is required, by virtue of the middleware applied in `index.ts`.
