---
type: session
date: 2026-05-09
duration: ~1h (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-6
  - data-layer
  - tasks
  - activity-log
  - migrations
---

# Block 6 — Tasks CRUD + activity log

> [!success] Outcome in one line
> Tasks have full CRUD with structured activity logging — every mutation emits the right events (`created`, `status_changed`, `priority_changed`, `field_edited` per audited field, `completed`, `archived`, `restored`) — and the time-shifted views (`/today`, `/upcoming`, `/waiting`) join through the `active_tasks` view's predicate so archived parents hide their children.

## Goal

Replace the tasks route stub with the densest data-layer block: full CRUD, the codified `active_tasks` view in SQL, and a mutation-side audit log driven by `AUDITED_TASK_FIELDS` from `@k-os/core`. After this block, every domain entity has a working API and the audit log is in place for Block 7's inbox triage flow to extend.

## Outcomes

### Migration

- ✅ **`packages/db/migrations/0001_active_tasks_view.sql`** — adds the `active_tasks` view exactly as in `docs/schema.md` ("Active-task filter (Q4)"). Hand-written; drizzle-kit doesn't author views. The journal is updated to register `idx: 1`.

### Helpers (`packages/api/src/routes/`)

- ✅ **`_tasks-helpers.ts`**:
  - `activeTasksWhere(workspaceId)` — Drizzle expression matching the view's predicate. Apply with a `LEFT JOIN projects` + `LEFT JOIN areas` so the archive-state checks resolve.
  - `emitTaskEvent(tx, input)` — typed insert into `task_events`. Accepts either the top-level Db or a transaction handle (`TxLike`); `actorKind` derives from whether `actorUserId` is set.
  - `diffTaskAuditedFields(before, after)` — walks `AUDITED_TASK_FIELDS` (snake_case) against camelCase Drizzle rows and returns one entry per change. Date values are compared by `getTime()` to avoid spurious diffs from re-instantiated dates. The internal `FIELD_KEY_MAP` is the single source for snake↔camel rename.

### Routes

- ✅ **`routes/tasks.ts`** — replaces the stub:
  - `GET /` — generic list with `?status` / `?project_id` / `?area_id` / `?person_id` / `?archived` filters, ordered by `createdAt desc`, capped at 500.
  - `GET /today` — joins active-tasks predicate, restricts to `next/scheduled/waiting/delegated`, then in-memory filters by today's clock window. The hybrid (DB filter + in-memory date fan-out) keeps the query simple while honoring the per-status time-column rule from the schema's "Today" view.
  - `GET /upcoming` — `next/scheduled` with `scheduled_at` in `[today_start, today_start + 30d)`.
  - `GET /waiting` — `waiting/delegated` ordered by `review_at`.
  - `GET /:id` — task + linked tags + last 50 events (single page; pagination via `/:id/events`).
  - `GET /:id/events` — paginated activity feed; `?limit` (1–200, default 50) and `?before` (ISO date cursor on `created_at`).
  - `POST /` — Zod-validated create. Optional `tagIds`: filtered to ones in the same workspace before the junction insert (defends against forged bodies). Emits `created` event. All in one transaction.
  - `PATCH /:id` — diff-based audit. Selects the row, updates, then emits `status_changed` / `priority_changed` if those moved, plus one `field_edited` event per audited-field change. Single transaction.
  - `DELETE /:id` — hard delete (rare; archive is the usual path).
  - `POST /:id/complete` — sets `status='done'` + `completed_at=now()`; emits both `completed` and a `status_changed` event so the activity log is unambiguous about how the task got there.
  - `POST /:id/archive` / `POST /:id/restore` — soft-delete pair, each emits its named event.

### Verification

- ✅ `pnpm --filter @k-os/api typecheck` — green.
- ⏳ Live verification (`PATCH due_at` → exactly one `field_edited` event with `payload: { field: 'due_at', from, to }`; archived project's tasks vanish from `/today`; restore brings them back) deferred to integration.

## Decisions made

- **Audit field list lives in `@k-os/core/audit.ts`** as the source of truth; this block's `_tasks-helpers.ts` adds the snake↔camel map. Adding a new audited field is a two-line change in two files (constant + map entry); both compile errors show up immediately if either is missed.
- **`field_edited` payload shape**: `{ field, from, to }` — matches schema doc verbatim. `from`/`to` carry whatever the column held (Date / string / null); the UI in Block 16 will format per-field.
- **Status / priority moves get their own structural events** in addition to (potentially) being in the audited-field list. We keep them separate because the UI cares about them as first-class state changes, not as generic field edits.
- **`/today` does in-memory date filtering** rather than a more complex SQL `WHERE`: the active set is already filtered by status + active predicate, leaving ≤ a few hundred rows in practice. Cheaper to fan out in JS than to write a multi-branch SQL clause that hits four indexes.
- **`/upcoming` window is 30 days**: matches the design's "Tomorrow / This week / Next week / Later" sections in Block 12. The screen will subdivide; the API just hands back the slice.
- **`activeTasksWhere` is a Drizzle expression**, not a query against `active_tasks`-the-view. Two reasons: (a) Drizzle doesn't track views, so you'd query via `sql\`active_tasks\`` and lose row typing; (b) the predicate is small, well-tested in one place, and lets Postgres's planner use the partial indexes from `tasks_*`. The view in the migration is for raw SQL convenience only.
- **`getTableColumns(tasks)` for select shape** — when you `LEFT JOIN`, plain `.select()` returns nested `{ tasks, projects, areas }` rows. Selecting the columns flat lets the route just return `{ tasks: rows }`.
- **`emitTaskEvent` accepts `TxLike`**: same pattern as `createWorkspaceForUserTx`. neon-http transactions are single-round-trip; the helper has to compose inside the caller's tx.
- **PATCH date conversion is centralised** at the top of the handler: each `dueAt` / `scheduledAt` / `reviewAt` is converted from string → `Date | null` before the `.set()` call. Avoids scattering `new Date(...)` through the body.

## Decisions deferred

- **Pagination metadata** (`hasMore`, `nextCursor`) on `/:id/events`: caller currently infers from `length === limit`. Add a structured cursor envelope when a UI starts caring (likely Block 16).
- **`recurring_rule` mutation routes**: tasks can be created/edited as templates by setting `recurring_rule`, but this block doesn't expose a dedicated route for that. Block 7 ships the recurring scheduler that materialises them; the `/tasks` POST/PATCH already accepts the field implicitly.
- **`commented` event kind**: structural event exists in `STRUCTURAL_TASK_EVENT_KINDS` but no `/:id/comment` route yet. Block 16 (task detail UI) wires it.
- **Tag updates on PATCH**: tags are only writable on POST today. Replacing the tag set on an existing task means a separate `PATCH /tasks/:id/tags` route, which Block 16 will add when the picker exists.

## Next steps

Block 7 — **Inbox + recurring task materialisation**. Inbox is just `status='inbox'` per Q9 of the schema; the route adds capture/triage shape + a stub for AI parse. Recurring materialisation is a function that produces instance rows from templates — wires up to a cron in Block 18.

## Notes & context

- **The activity log is a small but high-value invariant**. Emitting events from inside the same transaction as the mutation means a failed write rolls back the events too — no orphan log entries that contradict the row.
- **Migration ordering matters**: `0001_active_tasks_view.sql` references `tasks`, `projects`, `areas`, all from `0000`. The journal entry's `idx: 1` plus the file-name prefix together pin the order; drizzle-kit migrate runs them in numeric order.
- **`active_tasks` view + `activeTasksWhere` predicate are intentionally redundant**. The view is for ad-hoc SQL (Drizzle Studio, debugging, future raw queries); the predicate is for typed application queries. Both come from the same schema doc paragraph; if the rule changes, update both.
