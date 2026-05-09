---
type: session
date: 2026-05-09
duration: ~90m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - schema
  - data-model
  - planning
---

# Schema design — full data model locked

> [!success] Outcome in one line
> Schema fully specified at the table-and-field level, all 9 open questions resolved, captured in `docs/schema.md` as the source of truth before any code.

## Goal

Lock the data model. Walk every domain entity from the Project North Star design (`design/project-north-start/project/data.js`) plus the auth tables from the auth ADRs into a concrete schema, resolve every open design question, produce a single document the next phase (scaffolding) can transcribe into Drizzle without surprises.

## Outcomes

- ✅ Full schema specified — **17 tables** across 4 logical groups (auth & structural, reference & catalog, outcomes & responsibilities, tasks).
- ✅ All 9 open design questions answered (see [Decisions made](#decisions-made)).
- ✅ Recurring-rule shape pinned down as a typed JSONB discriminated union — covers daily/weekly/monthly with intervals, weekdays, and "first/last X of month".
- ✅ Audit-log mechanism designed for easy expansion — `AUDITED_TASK_FIELDS` constant in `packages/core/audit.ts` controls which field changes generate `field_edited` events.
- ✅ View patterns codified — `active_tasks` view excludes archived projects'/areas' tasks; search queries `tasks` directly so archived items remain searchable.
- ✅ Index plan written for all known query patterns (Today, People, Project/Area detail, Waiting, Inbox, Activity log).
- ✅ `pg_cron` job plan: recurring-task materialisation, session cleanup, token cleanup, stale-waiting surfacing.
- ✅ `docs/schema.md` committed as the source of truth.

## Decisions made

All resolved during this session. The schema doc captures the rationale; no separate ADRs needed unless any of these are revisited.

| # | Question | Decision |
|---|---|---|
| 1 | Contexts: editable table vs hard enum | **Editable workspace-scoped table**, seeded with the design's defaults |
| 2 | Tags: table vs `text[]` array | **Workspace-scoped table** for autocomplete and tag-based views |
| 3 | Project progress: stored vs computed | **Computed live** from tasks; never stored, never goes stale |
| 4 | Archived project ⇒ archived tasks? | **No** — tasks stay; active views filter via `active_tasks` view |
| 5 | `source_kind` enum vs free-form | **Both** — typed `source_kind` enum + free-form `source_ref` for display |
| 6 | Recurring rule shape | **Typed JSONB discriminated union** (daily/weekly/monthly_day/monthly_weekday); not full RRULE |
| 7 | Manual `position` field | **Yes** — keep; NULL means default sort, value overrides |
| 8 | Activity log granularity | **Medium** — reserved structural events + configurable `field_edited` via `AUDITED_TASK_FIELDS` constant |
| 9 | Inbox: separate table vs `status='inbox'` | **`status='inbox'`** — single `tasks` table; `ai_parsed jsonb` holds AI suggestions; triage = changing status |

The Q9 reversal (single table) is the most consequential — collapsed what was originally 18 tables to 17, simplified the AI parse flow, and unified the lifecycle.

## Structural decisions worth flagging

These came up during the session and are recorded in `docs/schema.md` but worth surfacing here for future session-readers:

- **Recurring tasks live as templates** with `recurring_rule IS NOT NULL`; instances reference the template via `parent_recurring_id`. Templates are excluded from user-facing views (`active_tasks` view filters `recurring_rule IS NULL`).
- **`waiting_for` and `waiting_since` are denormalized** onto `tasks` for fast Waiting-screen queries — no event-log scan or join needed.
- **`workspace_id` is denormalized onto `task_events`** so workspace-scoped queries (and future RLS) don't need a join through `tasks`.
- **Foreign keys default to `RESTRICT`**; cross-cutting refs (project_id, area_id, person_id, context_id on tasks) are `SET NULL` so deleting a project/area/person doesn't cascade-delete user data.
- **`pg_cron` jobs** for recurring instance materialisation and cleanup (sessions, tokens). Recurring materialisation is idempotent — runs nightly, generates the next 7 days of instances if missing.

## Open questions

None blocking. Some flagged in `docs/schema.md` under "Future considerations":

- Realtime publish strategy (deferred — TanStack Query covers MVP)
- Multi-user policy enforcement: Postgres RLS vs app-level (defer until sharing actually lands)
- Attachments table for [[0012 - storage-cloudflare-r2-deferred]]
- Cross-task links ("blocks", "depends on") — not in design
- RRULE expansion path if the JSONB shape proves insufficient

## Next steps

- [ ] **Repo scaffolding (Step B)** — pnpm workspace, Turborepo, Vite app, `packages/{ui,core,db,api,ai}`, ESLint/TS configs
- [ ] **Drizzle schema** — transcribe `docs/schema.md` into `packages/db/src/schema.ts` (the docs-to-code pass)
- [ ] **Drizzle Kit migration generation** — first migration produces all 17 tables + indexes + view
- [ ] **`pg_cron` job DDL** — written as part of migrations
- [ ] **Seed script** — creates an initial workspace with the 6 default contexts
- [ ] **Pre-scaffolding gather** (still needed): Google OAuth client ID + secret, SMTP credentials, Anthropic API key — not blocking until auth and AI routes go in

## Notes & context

- **Schema doc as source of truth**: the agreement is that `docs/schema.md` and `packages/db/src/schema.ts` are kept in sync manually. When a schema change comes, edit both. The doc is for human review; Drizzle is for runtime. Tools like drizzle-kit `introspect` could in principle generate one from the other, but the doc carries rationale and field-level commentary that schema code doesn't.
- **No ADRs were written for this session** because the schema doc captures the rationale where it's needed. If any of the 9 decisions later get revisited or contested, an ADR can be written then with `supersedes:` pointing back.
- **Q9 deserves a callout** — the user pushed back on my proposed `inbox_items` table and asked to make Inbox a status. Rationalising afterward: the user is right. Inbox-as-status keeps the lifecycle in one table, removes a triage-time data move, and makes the AI parse + accept-suggestions flow simpler. My `inbox_items` proposal was a category error — it treated triage as schema-shaped when it's actually status-shaped.
