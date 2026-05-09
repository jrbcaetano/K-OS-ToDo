# K-OS Schema

Source-of-truth schema for the K-OS database. This document is reviewed by humans and transcribed into Drizzle (`packages/db/schema.ts`) for runtime use. When schema changes, update this file *and* the Drizzle schema; treat them as synchronized.

## Status

**Locked** at end of the 2026-05-09 schema-design session. All open questions resolved. Migrations have not yet been generated — schema is documentation-only until scaffolding lands.

## Conventions

- **IDs**: `uuid` with `default gen_random_uuid()` (Postgres built-in; no extension needed on Postgres ≥ 13).
- **Timestamps**: always `timestamptz`. `created_at` defaults to `now()`.
- **Soft delete**: tables that support archiving have an `archived_at timestamptz` column (NULL = active).
- **Workspace scoping**: every domain row has `workspace_id NOT NULL`. ([[0003 - workspace-scoped-schema-for-multi-user-readiness]])
- **Foreign keys**: default `ON DELETE RESTRICT`. Lifecycle-owned children use `CASCADE` (e.g. `sessions.user_id`, `task_events.task_id`). Cross-cutting refs that should survive parent deletion use `SET NULL` where the FK column is nullable.
- **Enums**: stored as `text` with `CHECK` constraints. Avoids `ALTER TYPE` migrations and keeps Drizzle schema simple.
- **Naming**: `snake_case` for tables and columns; tables are plural (`tasks`, `people`); junction tables use both nouns (`project_people`).

---

## Group 1 — Auth & structural

### `users`

```sql
create table users (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  email_verified_at   timestamptz,
  password_hash       text,                                 -- nullable: OAuth-only users
  display_name        text not null,
  avatar_color        text,                                 -- hex; falls back to derived if NULL
  created_at          timestamptz not null default now()
);
```

| Field | Notes |
|---|---|
| `password_hash` | Argon2id via `oslo/password`. NULL for users who only have OAuth methods. |
| `email_verified_at` | NULL until verification flow completes. Used for [[0016 - account-linking-auto-on-verified-email]]. |
| `avatar_color` | Optional override of UI's deterministic colour-from-name fallback. |

### `sessions`

```sql
create table sessions (
  token_hash      text primary key,                         -- SHA-256 of the raw token
  user_id         uuid not null references users(id) on delete cascade,
  expires_at      timestamptz not null,
  last_seen_at    timestamptz not null,
  user_agent      text,
  ip_hash         text,                                     -- hashed for privacy
  revoked_at      timestamptz
);
```

Per [[0017 - sessions-not-jwts]]. Sliding-window expiry: `expires_at` updates on each successful validation up to a maximum lifetime. `pg_cron` cleans up expired and revoked rows nightly.

### `oauth_accounts`

```sql
create table oauth_accounts (
  provider            text not null,                        -- 'google', 'apple', 'github', ...
  provider_user_id    text not null,
  user_id             uuid not null references users(id) on delete cascade,
  email               text,                                 -- denormalized for matching
  created_at          timestamptz not null default now(),
  primary key (provider, provider_user_id)
);
```

A user can have many OAuth accounts (one per provider, multiple providers). The `(provider, provider_user_id)` PK guarantees a given provider account belongs to exactly one user — enforces account-linking policy ([[0016]]).

### `verification_tokens`

```sql
create table verification_tokens (
  token_hash      text primary key,                         -- SHA-256
  user_id         uuid references users(id) on delete cascade,
  email           text,                                     -- for unverified-email flows
  purpose         text not null check (purpose in ('magic_link','email_verify','password_reset')),
  expires_at      timestamptz not null,
  consumed_at     timestamptz
);
```

Single mechanism for magic-link, email verification, and (future) password reset. Tokens are hashed before storage; raw token is sent once via email and never persisted.

### `workspaces`

```sql
create table workspaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now()
);
```

Single workspace seeded for each new user; UI doesn't expose a switcher until a second workspace exists. ([[0003]])

### `workspace_members`

```sql
create table workspace_members (
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            text not null check (role in ('owner','member','viewer')),
  added_at        timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
```

Permissions filter by membership in this table. `role` reserved for future use — at MVP the user is always the sole owner.

---

## Group 2 — Reference & catalog

### `contexts`

```sql
create table contexts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  slug            text not null,
  label           text not null,
  color           text not null,                            -- token reference or hex
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (workspace_id, slug)
);
```

User-editable workspace-scoped table (Q1 — editable). Seeded for new workspaces with the design's defaults: `boxfusion`, `praesto`, `personal`, `family`, `health`, `home`. Users can rename, recolour, reorder, add, or remove.

### `tags`

```sql
create table tags (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  unique (workspace_id, name)
);
```

Workspace-scoped (Q2 — table). Free-form labels for cross-cutting themes ("leveling", "deep-work", "client") that don't fit Project/Area/Context.

### `people`

```sql
create table people (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  name            text not null,
  initials        text not null,                            -- explicit, not derived
  context_id      uuid references contexts(id) on delete set null,
  role            text,                                     -- 'Direct report · Delivery Lead'
  color           text not null,                            -- person identity color
  last_seen_at    timestamptz,
  next_meeting_at timestamptz,
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz
);
```

Workspace-scoped — when family/org sharing comes, "Andy" is one row visible to all members. Soft-delete via `archived_at`.

---

## Group 3 — Outcomes & responsibilities

### `projects`

```sql
create table projects (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  name            text not null,
  outcome         text not null,
  context_id      uuid references contexts(id) on delete set null,
  status          text not null default 'on_track'
                  check (status in ('on_track','needs_attention','idle','blocked')),
  target_date     date,
  -- progress is COMPUTED LIVE from tasks (Q3), not stored. See "View patterns" below.
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz,
  archive_reason  text check (archive_reason in ('completed','dropped','paused','replaced')),
  archive_note    text,
  archived_by     uuid references users(id)
);
```

Archived projects keep their tasks (Q4); active views filter via JOIN.

### `areas`

```sql
create table areas (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  name            text not null,
  standard        text not null,                            -- the quoted "creed"
  context_id      uuid references contexts(id) on delete set null,
  cadence         text,                                     -- free-form: 'Reviewed weekly'
  last_reviewed_at  timestamptz,
  next_review_at  timestamptz,
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz,
  archive_reason  text check (archive_reason in ('completed','dropped','paused','replaced')),
  archive_note    text,
  archived_by     uuid references users(id)
);
```

Same archive semantics as projects.

### `project_people` and `area_people`

```sql
create table project_people (
  project_id      uuid not null references projects(id) on delete cascade,
  person_id       uuid not null references people(id) on delete cascade,
  role            text,                                     -- 'lead', 'stakeholder'; nullable
  primary key (project_id, person_id)
);

create table area_people (
  area_id         uuid not null references areas(id) on delete cascade,
  person_id       uuid not null references people(id) on delete cascade,
  role            text,
  primary key (area_id, person_id)
);
```

Many-to-many. `role` is workspace-conventional, not enum-constrained — different teams use different vocab.

---

## Group 4 — Tasks

### `tasks`

```sql
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  title           text not null,
  description     text,                                     -- the editable description block

  status          text not null default 'next'
                  check (status in (
                    'inbox',                                -- raw capture, awaiting triage (Q9)
                    'next',
                    'scheduled',
                    'waiting',
                    'delegated',
                    'blocked',
                    'someday',
                    'done'
                  )),
  priority        text not null default 'routine'
                  check (priority in ('critical','important','routine','low')),

  context_id      uuid references contexts(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  area_id         uuid references areas(id) on delete set null,
  person_id       uuid references people(id) on delete set null,
  owner_id        uuid not null references users(id),       -- accountable user; default = created_by

  source_kind     text check (source_kind in (
                    'manual','email','slack','meeting','mobile_capture','calendar','phone','other'
                  )),
  source_ref      text,                                     -- 'Email · Rita Almeida', 'Slack · Pedro', ...

  due_at          timestamptz,                              -- hard deadline
  scheduled_at    timestamptz,                              -- planned work date (soft)
  review_at       timestamptz,                              -- when to surface (waiting/delegated)
  completed_at    timestamptz,                              -- set when status → 'done'

  -- Recurring (Q6) — see RecurringRule type below
  recurring_rule        jsonb,                              -- on a TEMPLATE task; NULL on instances and normal tasks
  parent_recurring_id   uuid references tasks(id),          -- on instances; points at the template

  -- Waiting context (denormalized for performance)
  waiting_for     text,                                     -- 'Andy', '(physio clinic)'
  waiting_since   timestamptz,                              -- when this entered waiting

  -- AI-suggested fields (Q9 absorbed inbox)
  ai_parsed       jsonb,                                    -- { suggested_title?, suggested_fields?: { ... } }

  position        int,                                      -- manual ordering within a view (Q7)

  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz
);
```

Field-level notes:

| Field | Notes |
|---|---|
| `status='inbox'` | Raw capture. `title` is the captured text or AI-extracted title; `description` holds the body. Most other fields NULL until triaged. |
| `recurring_rule` | Lives on a *template* task with `recurring_rule IS NOT NULL`. Instances reference the template via `parent_recurring_id`. The template itself is never shown in a normal view — `tasks WHERE recurring_rule IS NULL` is the user-facing set. |
| `parent_recurring_id` | NULL for normal tasks; set for materialised instances. |
| `waiting_for`, `waiting_since` | Denormalized so the Waiting screen doesn't need extra joins / event-log scans. Updated by the mutation that sets `status='waiting'` or `status='delegated'`. |
| `ai_parsed` | Populated asynchronously after capture. Suggestions never auto-apply — user explicitly accepts during triage. |
| `position` | NULL means "default sort order". Setting `position` overrides default sort within a view. |

### `task_tags`

```sql
create table task_tags (
  task_id         uuid not null references tasks(id) on delete cascade,
  tag_id          uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);
```

### `task_events`

```sql
create table task_events (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references tasks(id) on delete cascade,
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  kind            text not null,
  actor_kind      text not null check (actor_kind in ('user','agent','system')),
  actor_user_id   uuid references users(id),                -- null when actor_kind != 'user'
  payload         jsonb,                                    -- shape depends on kind
  created_at      timestamptz not null default now()
);
```

**Reserved structural event kinds** (always logged, hard-coded):
`created`, `status_changed`, `priority_changed`, `completed`, `archived`, `restored`, `commented`, `agent_suggested`, `agent_acted`.

**Configurable field-edit events**: `field_edited` with `payload: { field, from, to }`. Controlled by the `AUDITED_TASK_FIELDS` constant in `packages/core/audit.ts` (see [Audit configuration](#audit-configuration)).

`workspace_id` is denormalized onto every event so workspace-scoped queries (and future RLS) don't need a join through `tasks`.

---

## Special types

### `RecurringRule` (JSONB shape — Q6)

Stored in `tasks.recurring_rule`. TypeScript shape:

```ts
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type RecurringRule =
  | { kind: 'daily';   interval: number }
  | { kind: 'weekly';  interval: number; weekdays: Weekday[] }                               // weekdays empty → every N weeks on the template's anchor day
  | { kind: 'monthly_day';      interval: number; dayOfMonth: number }                       // 'every 1st of the month'
  | { kind: 'monthly_weekday';  interval: number; week: 1|2|3|4|-1; weekday: Weekday };      // 'first Monday', 'last Friday'

// Examples:
// { kind: 'daily', interval: 1 }                                                      → every day
// { kind: 'weekly', interval: 1, weekdays: ['mon','wed','fri'] }                      → MWF
// { kind: 'weekly', interval: 2, weekdays: ['tue'] }                                  → every other Tuesday
// { kind: 'monthly_day', interval: 1, dayOfMonth: 1 }                                 → 1st of every month
// { kind: 'monthly_weekday', interval: 1, week: 1, weekday: 'mon' }                   → first Monday of every month
// { kind: 'monthly_weekday', interval: 3, week: -1, weekday: 'fri' }                  → last Friday of every quarter
```

Covers daily/weekly/monthly with intervals, specific weekdays, specific days of month, "first/last X of month". Skips full RFC 5545 (BYSETPOS, BYWEEKNO, EXDATE, COUNT-limited, BYHOUR, etc.).

If a future use-case needs the missing pieces, options are:
1. Extend `RecurringRule` with new variants (forward-compatible — old templates still parse)
2. Add an `rrule_text TEXT` column for full RRULE strings; read whichever is non-null

---

## Audit configuration

Activity-log granularity (Q8) is medium *and* easy to expand/contract via a single constant:

```ts
// packages/core/src/audit.ts
export const AUDITED_TASK_FIELDS = [
  'due_at',
  'scheduled_at',
  'review_at',
  'project_id',
  'area_id',
  'person_id',
  'owner_id',
  'context_id',
  'description',
] as const;
```

The mutation handler in `packages/api` computes a diff between old and new task state. For each changed field that's in `AUDITED_TASK_FIELDS`, it emits a `field_edited` event with `payload: { field, from, to }`.

**To add an audited field**: add the column name to the array.
**To stop auditing a field**: remove it. Existing events stay (history preserved); future edits stop generating events.

The same pattern applies to projects and areas if/when activity logs are added there — separate constant per entity.

---

## View patterns

Common queries are codified as helpers in `packages/db` so the join shapes don't get rewritten everywhere.

### Active-task filter (Q4 — view filters via project/area archive state)

```sql
-- Helper: tasks visible in active views (Today, Upcoming, Project picker, etc.)
-- Excludes tasks belonging to archived projects or archived areas.

create view active_tasks as
select t.*
from tasks t
left join projects p on t.project_id = p.id
left join areas    a on t.area_id    = a.id
where t.archived_at is null
  and t.recurring_rule is null                              -- exclude templates
  and (t.project_id is null or p.archived_at is null)
  and (t.area_id    is null or a.archived_at is null);
```

Search and global views query `tasks` directly (not `active_tasks`) so archived items remain searchable.

### Today

```sql
-- Pseudo-query; real one uses Drizzle expressions
select * from active_tasks
where workspace_id = $1
  and (
    (status = 'next' and (due_at < $today_end or scheduled_at < $today_end))
    or (status = 'scheduled' and scheduled_at < $today_end)
    or (status = 'waiting' and review_at <= $today)
    or (status = 'delegated' and review_at <= $today)
  )
order by ... ;  -- composite: priority, due_at, scheduled_at, position
```

### Inbox

```sql
select * from tasks
where workspace_id = $1
  and status = 'inbox'
  and archived_at is null
order by created_at desc;
```

### Project progress (computed live — Q3)

```sql
-- For one project:
select
  count(*) filter (where status = 'done')::float / nullif(count(*), 0) as progress,
  count(*) filter (where status != 'done') as open,
  count(*) filter (where due_at < now() and status != 'done') as overdue
from active_tasks
where workspace_id = $1
  and project_id = $2;
```

### Person open loops

```sql
select count(*)
from active_tasks
where workspace_id = $1
  and person_id = $2
  and status in ('next','scheduled','waiting','delegated','blocked');
```

---

## Indexes

```sql
-- Today / due-date scans
create index tasks_workspace_status_due
  on tasks (workspace_id, status, due_at)
  where archived_at is null and recurring_rule is null;

create index tasks_workspace_status_scheduled
  on tasks (workspace_id, status, scheduled_at)
  where archived_at is null and recurring_rule is null;

-- People view
create index tasks_workspace_person_status
  on tasks (workspace_id, person_id, status)
  where archived_at is null;

-- Project / Area detail
create index tasks_workspace_project
  on tasks (workspace_id, project_id)
  where archived_at is null and project_id is not null;

create index tasks_workspace_area
  on tasks (workspace_id, area_id)
  where archived_at is null and area_id is not null;

-- Waiting screen
create index tasks_workspace_waiting
  on tasks (workspace_id, review_at)
  where status in ('waiting','delegated') and archived_at is null;

-- Inbox
create index tasks_workspace_inbox
  on tasks (workspace_id, created_at desc)
  where status = 'inbox' and archived_at is null;

-- Activity log
create index task_events_task_created
  on task_events (task_id, created_at desc);

-- Recurring template lookup
create index tasks_recurring_template
  on tasks (workspace_id)
  where recurring_rule is not null;

-- Auth lookups
create index sessions_user on sessions (user_id) where revoked_at is null;
create index oauth_accounts_user on oauth_accounts (user_id);
create index verification_tokens_user on verification_tokens (user_id);
create index verification_tokens_email on verification_tokens (email) where consumed_at is null;
```

Partial indexes (`WHERE`) keep them small and aligned with the actual queries.

---

## Triggers / cron jobs

Run via `pg_cron` on Neon (or Vercel cron + API endpoints if `pg_cron` isn't available — same effect).

| Job | Frequency | Purpose |
|---|---|---|
| `materialise_recurring_tasks` | nightly at 02:00 UTC | For each task with `recurring_rule IS NOT NULL`, create instances for the next 7 days that don't already exist |
| `cleanup_expired_sessions` | nightly at 03:00 UTC | `DELETE FROM sessions WHERE expires_at < now() - interval '30 days'` |
| `cleanup_consumed_tokens` | weekly | `DELETE FROM verification_tokens WHERE consumed_at IS NOT NULL OR expires_at < now() - interval '30 days'` |
| `surface_stale_waiting` | daily | Compute "stale" waiting items (no movement in N days) for the Review screen |

Recurring-task materialisation is idempotent: skip instances where `(parent_recurring_id, scheduled_at)` already exists.

---

## Future considerations (not blocking MVP)

- **Realtime** — when added (Postgres `LISTEN/NOTIFY` → WebSocket), publish events on `tasks` and `task_events` table changes; client subscribes by `workspace_id`.
- **Multi-user policies** — at MVP, app-level guards filter by `workspace_id`. When sharing lands, decide between Postgres RLS (defense in depth) and continued app-level enforcement.
- **Attachments** — add `task_attachments(task_id, r2_key, filename, size, mime)` once [[0012 - storage-cloudflare-r2-deferred]] is reactivated.
- **Cross-task links** ("blocks", "depends on", "duplicates") — add `task_links(from_task_id, to_task_id, kind)` if/when needed; not in design.
- **Knowledge module / graph** — when [[K-OS Platform Vision|K-OS Knowledge]] arrives, add `entities` + `entity_links` as a generalised cross-module association layer; tasks/projects/people/notes would all join to `entities`.
- **RRULE expansion** — if the simpler JSONB rule shape proves insufficient, see "Special types" above for the extension path.

---

## References

- [[0003 - workspace-scoped-schema-for-multi-user-readiness]]
- [[0008 - database-neon-postgres]]
- [[0010 - orm-drizzle]]
- [[0014 - auth-methods-password-magic-link-google-oauth]]
- [[0017 - sessions-not-jwts]]
- [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]]
- design/project-north-start/project/data.js (in repo) — sample data validating these shapes
