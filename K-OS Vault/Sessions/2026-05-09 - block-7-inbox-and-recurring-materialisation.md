---
type: session
date: 2026-05-09
duration: ~50m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-7
  - data-layer
  - inbox
  - recurring
  - jobs
---

# Block 7 — Inbox + recurring task materialisation

> [!success] Outcome in one line
> Phase 2 closes: capture/triage/discard endpoints back the Quick-Capture flow (with a clearly-marked AI parse hook for Block 18), and a workspace-scoped, idempotent recurring-task materialiser is in place behind a manual admin endpoint.

## Goal

Replace the inbox stub with real handlers and ship the recurring scheduler — both halves of [[k-os-todo-implementation|Block 7]] — closing Phase 2's data layer.

## Outcomes

### Inbox routes

- ✅ **`routes/inbox.ts`** (replaces stub):
  - `GET /` — `tasks?status=inbox` shorthand: returns active inbox rows ordered `created_at desc`.
  - `POST /capture` — Zod-validated `{ title, description?, sourceKind?, sourceRef? }`. Creates a task with `status='inbox'`, `priority='routine'`, `sourceKind` defaulting to `'manual'`. Emits `created` with `payload: { source: 'inbox_capture' }`. **AI parse hook** is a clearly-marked no-op (`aiParsed = null`) — Block 18 wires the real Anthropic call and stores the result on `tasks.ai_parsed`.
  - `POST /:id/triage` — body accepts `{ status: <non-inbox status>, contextId?, projectId?, areaId?, personId?, dueAt?, scheduledAt?, reviewAt?, waitingFor? }`. Triages only rows currently in `inbox`. Emits one `status_changed` event with `payload: { from: 'inbox', to, source: 'triage' }`.
  - `POST /:id/discard` — soft-archives the inbox row only (refuses if it's already been triaged). Emits `archived` with `payload: { source: 'inbox_discard' }`.

### Recurring scheduler

- ✅ **`packages/core/src/recurring.ts`** — added `nextOccurrences(rule, from, until)` covering all four `RecurringRule` kinds (daily / weekly / monthly_day / monthly_weekday). Skips months whose anchor day doesn't exist (e.g. Feb 31). Weekday indices match the schema's Mon-first ordering. Returns `Date` values normalized to local midnight — instances inherit the time-of-day (or lack of it) from the template; the simplest workable shape for MVP.
- ✅ **`packages/api/src/jobs/materialise-recurring.ts`** — `materialiseRecurring(db, { workspaceId, from?, until? })`:
  - Default horizon: 7 days from `from`.
  - Pulls all `recurring_rule IS NOT NULL` rows for the workspace.
  - For each template: computes `nextOccurrences` over the horizon, queries existing instances (`parent_recurring_id = template.id`), filters out occurrences whose `scheduled_at.getTime()` already exists. Idempotent on rerun.
  - Bulk insert one `INSERT` per template, inheriting title/description/priority/context/project/area/person/owner/createdBy.
  - Returns `{ templatesScanned, instancesCreated }`.
- ✅ **`routes/admin.ts`** + mount in `index.ts` — `POST /admin/materialise-recurring` calls the job for the caller's workspace. Useful for debugging and for the cron in Block 18 to fan out per workspace.

### Index updates

- ✅ **`packages/api/src/index.ts`** — `/admin/*` added to `PROTECTED_PREFIXES` so it falls under the same `requireAuth` gate as the rest of the domain routes. `/admin` mounted after AI.

### Verification

- ✅ `pnpm -r typecheck` — green across all 6 packages + `apps/web`.
- ⏳ Live verification (capture an item; triage to `next` with a `dueAt`; discard another; create a weekly template `weekdays: ['mon']` and run `POST /admin/materialise-recurring` twice → second run reports `instancesCreated: 0`) deferred.

## Decisions made

- **Inbox is just a status, not a separate route family**. `GET /api/inbox` is shorthand for `/api/tasks?status=inbox`, but having `/inbox/capture` and `/inbox/:id/{triage,discard}` keeps the UI clean — those flows have specific semantics (event payload tags `source: 'inbox_capture' | 'triage' | 'inbox_discard'`).
- **Triage is a structural transition, not a generic PATCH**: it requires the task to be currently in `inbox` and refuses otherwise. Avoids accidentally "triaging" a task that's already been processed.
- **`source` payload tag** on the emitted events: lets the UI distinguish "completed via Today" from "completed via inbox triage" if it ever wants to. Cheap to add now, painful to backfill later.
- **`nextOccurrences` returns local-time midnights**: simpler than tracking time-of-day per template; the design's recurring-task UX ("Pay rent on the 1st") doesn't care about clock time. If a template needs a specific time, the instance can be PATCHed after materialisation, or a future revision adds an explicit `time_of_day` column to templates.
- **Materialiser idempotency by `(parent_recurring_id, scheduled_at)` set comparison** rather than a unique index: a unique index would force a duplicate-row decision at insert time; the set-membership check lets us skip cleanly with no error path.
- **Job scope is per-workspace, not whole-DB**: matches how cron will fan out (Block 18 lists workspaces via cron and triggers one HTTP call per). Keeps the failure radius small — one workspace's bad template doesn't block another.
- **Admin route requires a session for now**: a future cron-actor path can sign requests with a shared secret header; deferred until Block 18 stands up the cron.
- **No `pg_cron` SQL migration in this block**: the plan listed it as an option, but Neon's free-tier `pg_cron` availability is uncertain. Deferring the cron wiring entirely to Block 18 — the materialiser is already callable from anywhere (HTTP or, eventually, a worker process).

## Decisions deferred

- **`templates` listing endpoint**: there's no `/tasks?recurring=true` view yet. Templates show up in `/tasks` only if the caller explicitly drops the active filter. Block 14 (Areas) will surface them; revisit if not.
- **Backfill of past occurrences**: the materialiser only looks forward. A power user could ask for "create the missing instances from the last 30 days"; trivial to add via the existing helper.
- **Time-of-day on templates**: see above. Schema gap, not worth a follow-up ADR until a concrete user request.
- **Rate limit on `/admin/materialise-recurring`**: it does N + 1 queries where N = templates. Cheap. Add if logs show abuse.

## Open questions

- **Will Neon's free tier support `pg_cron`?** The official answer is "available on paid tiers"; for the dev branch it likely is not. Block 18 falls back on Vercel Cron, which is a normal HTTP call to `/admin/materialise-recurring`. Either way the job code is the same.
- **Is the 7-day horizon the right default?** Long enough that a user opening Today after a week off still sees their recurring tasks; short enough that the materialised set stays tidy. Block 14 might want it as workspace setting.

## Next steps

Phase 2 done. **Phase 3 — UI foundation** opens:

- [ ] **Block 8: Design system primitives port**. The prototype's `primitives.jsx` ports to `packages/ui/src/components/` as `.tsx` + `.module.css` pairs, consuming the existing `tokens.css`. After Block 8 the API layer can be exercised by real components.

## Notes & context

- **Phase 1 + 2 in numbers**: 7 of 18 blocks done. Every domain entity has a working CRUD surface. The auth surface, the workspace primitive, the activity log, and the recurring scheduler are in place; the data plane is ready for the UI work.
- **`@k-os/core/recurring.ts` is now load-bearing**: the materialiser depends on `nextOccurrences`. If the rule shape ever extends, the helper has the only place that needs branching changes.
- **Shape of an "agent" actor**: the structural `agent_acted` event kind in `STRUCTURAL_TASK_EVENT_KINDS` is reserved for Block 18; the materialiser does not emit one (the instance create event in Block 18 might).
