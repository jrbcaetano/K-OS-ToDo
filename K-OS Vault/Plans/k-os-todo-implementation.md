---
type: plan
module: k-os-todo
status: in-progress
created: 2026-05-09
updated: 2026-05-09
tags:
  - plan
  - k-os-todo
  - implementation
---

# K-OS ToDo — Implementation Plan

End-to-end roadmap from the current scaffolded skeleton (commit `a8dda37`, 2026-05-09) to a feature-complete K-OS ToDo MVP. **18 blocks across 6 phases.** Each block is sized for one focused session.

> [!info] How to use this plan
> 1. Open the block you want to implement.
> 2. Copy the **Trigger prompt** at the bottom of the block into a new Claude session.
> 3. Claude will read the vault context, implement the deliverables, and write a session note when done.
> 4. After the session, mark the block done in the [Block status](#block-status) table at the bottom.
>
> Blocks are sequenced so each one's dependencies are satisfied by earlier blocks. Doing them out of order is possible but you'll have to carry the gap manually.

## Pre-flight checklist (before Block 1)

These should already be true after the scaffolding session, but verify:

- [ ] `pnpm install` completes cleanly
- [ ] Local `.env` exists with `DATABASE_URL` pointing at the **dev** Neon branch ([[database-branch-strategy]])
- [ ] First migration generated and applied: `pnpm db:generate && pnpm db:migrate`
- [ ] Anthropic API key in `.env` as `ANTHROPIC_API_KEY` (needed from Block 18; non-blocking until then)
- [ ] SMTP credentials in `.env` (needed from Block 2; non-blocking until then)
- [ ] Google OAuth client registered (needed from Block 3; non-blocking until then)
- [ ] `pnpm dev` serves the placeholder Today screen on port 5173

## Phases at a glance

| Phase | Blocks | Theme |
|---|---|---|
| **1 — Foundation** | 1–3 | Sessions, all auth methods, account linking |
| **2 — Data layer** | 4–7 | CRUD for every entity + activity log + recurring scheduler |
| **3 — UI foundation** | 8–9 | Design system primitives + app shell |
| **4 — Core screens** | 10–12 | Today, Inbox + Quick Capture, time-shifted views |
| **5 — Detail screens** | 13–16 | Projects, Areas, People, Task detail |
| **6 — Mobile + Intelligence + Polish** | 17–18 | Responsive layouts, AI, launch prep |

---

## Phase 1 — Foundation

### Block 1: Sessions + workspace + auth middleware

**Goal**: Stand up the auth spine — opaque session tokens, the workspace primitive, and the middleware that gates every domain route.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note — for current state)
- `K-OS Vault/Decisions/0013 - auth-on-oslo-and-arctic-not-lucia.md`
- `K-OS Vault/Decisions/0017 - sessions-not-jwts.md`
- `K-OS Vault/Decisions/0003 - workspace-scoped-schema-for-multi-user-readiness.md`
- `K-OS Vault/Decisions/0009 - api-hono-on-vercel-serverless.md`
- `docs/schema.md` → "Auth & structural" section

**Deliverables**:
- `packages/api/src/auth/sessions.ts` — `createSession`, `validateSession` (with sliding-window expiry), `revokeSession`, `revokeAllForUser`. Tokens hashed with SHA-256 before DB insert per [[0017 - sessions-not-jwts]].
- `packages/api/src/auth/cookies.ts` — `setSessionCookie`, `clearSessionCookie` with `HttpOnly`, `Secure`, `SameSite=Lax`.
- `packages/api/src/auth/workspace.ts` — `createWorkspaceForUser` helper (creates `workspaces` row + `workspace_members` row with `role='owner'`).
- `packages/api/src/middleware/auth.ts` — Hono middleware that reads the session cookie, validates, loads the user + active workspace, and stores them on the Hono context. Returns 401 if invalid.
- `packages/api/src/middleware/workspace.ts` — extracts `workspace_id` from context and exposes it for downstream queries.
- Update `packages/api/src/index.ts` to apply the auth middleware to all `/tasks`, `/inbox`, `/projects`, `/areas`, `/people`, `/contexts`, `/tags`, `/ai` routes (skip `/auth/*` and `/health`).

**Verification**:
- Hitting any protected route without a session returns 401.
- A test session inserted directly into the DB lets the corresponding cookie pass middleware and reach a 501-stub route.

**Trigger prompt**:

```
Implement Block 1 of the K-OS implementation plan: "Sessions + workspace + auth middleware".

Before doing anything else, read these files in this order:
1. CLAUDE.md (project working agreements and pointers)
2. The newest note in "K-OS Vault/Sessions/" (for current project state)
3. "K-OS Vault/Plans/k-os-todo-implementation.md" — find "Block 1: Sessions + workspace + auth middleware" and read its full deliverables and verification criteria
4. ADRs: 0013 (oslo+arctic), 0017 (sessions-not-jwts), 0003 (workspace-scoped), 0009 (Hono-on-Vercel)
5. "docs/schema.md" → "Auth & structural" section

Then implement Block 1 end-to-end. The plan section lists every file to create. Don't re-decide architectural choices that are locked in ADRs. Don't push to GitHub without explicit user request — but do commit when the block is complete.

When finished, write a session note in "K-OS Vault/Sessions/" following the convention in Sessions.md (filename pattern, frontmatter, required sections), and add it to the Sessions index.
```

---

### Block 2: Password + magic link auth

**Goal**: Ship two of the three sign-in methods, both writing to the same user model.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 2
- `K-OS Vault/Decisions/0014 - auth-methods-password-magic-link-google-oauth.md`
- `K-OS Vault/Decisions/0015 - email-own-smtp-via-nodemailer.md`
- `K-OS Vault/Decisions/0017 - sessions-not-jwts.md`

**Deliverables**:
- `packages/api/src/auth/password.ts` — Argon2id hashing via `oslo/password`; `signup(email, password, displayName)`, `verifyPassword`.
- Implement routes in `packages/api/src/routes/auth/password.ts` (replace the stub):
  - `POST /signup` — creates user, creates workspace, returns session cookie
  - `POST /login` — verifies password, creates session
  - `POST /logout` — revokes current session, clears cookie
- `packages/api/src/email/transporter.ts` — nodemailer transporter from SMTP env vars.
- `packages/api/src/email/templates/magic-link.ts` — plain-text + HTML.
- Implement routes in `packages/api/src/routes/auth/magic-link.ts`:
  - `POST /request` — issues hashed token in `verification_tokens` (purpose='magic_link', 15-min expiry), emails the link
  - `POST /verify` — consumes token, creates session if user exists or creates user + workspace then session
- Per-IP rate limiting on `/login`, `/signup`, `/magic-link/request` (in-memory token bucket is fine for MVP).

**Verification**:
- Signup creates `users`, `workspaces`, `workspace_members` rows, returns session cookie.
- Login with wrong password fails with timing-safe comparison.
- Magic-link email arrives at a test inbox, link works once, second use returns 410.

**Trigger prompt**:

```
Implement Block 2 of the K-OS implementation plan: "Password + magic link auth".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 2: Password + magic link auth"
4. ADRs: 0014 (auth methods), 0015 (own SMTP via nodemailer), 0017 (sessions)

Then implement Block 2 end-to-end. The plan section lists every route, helper, and email template to build. Use oslo/password for Argon2id; nodemailer for SMTP; the verification_tokens table for one-shot links. Don't re-decide; ADRs cover the rationale. SMTP credentials live in env vars per ADR 0015.

Confirm that user signup creates a workspace and seats the user as owner (the workspace creation helper should already exist from Block 1).

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 3: Google OAuth + account linking

**Goal**: Add Google as the third sign-in method with auto-link on verified email.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 3
- `K-OS Vault/Decisions/0014 - auth-methods-password-magic-link-google-oauth.md`
- `K-OS Vault/Decisions/0016 - account-linking-auto-on-verified-email.md`

**Deliverables**:
- `packages/api/src/auth/oauth-google.ts` — `arctic` Google client setup; `getAuthorizationUrl`, `validateAuthorizationCode`.
- Implement routes in `packages/api/src/routes/auth/oauth-google.ts`:
  - `GET /authorize` — generates state cookie + redirects to Google's OAuth URL
  - `GET /callback` — validates state, exchanges code for tokens, fetches user info, applies linking policy, creates session
- `packages/api/src/auth/account-linking.ts` — encapsulates the policy from [[0016]]: if email matches existing user AND OAuth provider verified the email, link automatically; otherwise create new user.
- Update `.env.example` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` if not already there (they are).

**Verification**:
- Authorize redirects to Google with correct params and state cookie.
- Callback handles new-user creation and existing-user linking.
- Trying to link a Google account already attached to a different user blocks gracefully.

**Trigger prompt**:

```
Implement Block 3 of the K-OS implementation plan: "Google OAuth + account linking".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 3: Google OAuth + account linking"
4. ADRs: 0014 (auth methods), 0016 (account linking policy)

Then implement Block 3 end-to-end. Use the `arctic` library's Google client. The account linking policy is locked in ADR 0016: auto-link when the OAuth provider returns a verified email matching an existing user; otherwise create a new user. Google always verifies emails, so for now auto-link is the default path.

Sessions and the workspace creation helper are already in place from Block 1; reuse them.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

## Phase 2 — Data layer

### Block 4: Catalog CRUD (contexts, tags) + workspace seeding

**Goal**: Workspace creation auto-seeds the 6 default contexts; UI surface for managing contexts and tags.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 4
- `K-OS Vault/Decisions/0003 - workspace-scoped-schema-for-multi-user-readiness.md`
- `docs/schema.md` → "Reference & catalog" section
- `packages/core/src/enums.ts` → `DEFAULT_CONTEXTS`

**Deliverables**:
- Implement `packages/api/src/routes/contexts.ts` (replace stub):
  - `GET /` — list contexts in current workspace, ordered by `sort_order`
  - `POST /` — create
  - `PATCH /:id` — rename / recolor
  - `DELETE /:id` — delete (FK constraint on tasks/projects/areas should `SET NULL`)
  - `POST /reorder` — bulk update `sort_order`
- Implement `packages/api/src/routes/tags.ts` similarly
- Update `packages/api/src/auth/workspace.ts` (from Block 1): when creating a workspace, INSERT the 6 `DEFAULT_CONTEXTS` rows.
- All routes use the workspace middleware from Block 1 to scope queries.

**Verification**:
- New signup → 6 contexts already present in the user's workspace.
- Context rename reflects in subsequent GETs.
- Deleting a context with linked tasks doesn't error; the tasks now have `context_id = NULL`.

**Trigger prompt**:

```
Implement Block 4 of the K-OS implementation plan: "Catalog CRUD (contexts, tags) + workspace seeding".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 4: Catalog CRUD (contexts, tags) + workspace seeding"
4. ADR 0003 (workspace-scoped schema)
5. "docs/schema.md" → "Reference & catalog" section
6. "packages/core/src/enums.ts" → DEFAULT_CONTEXTS

Then implement Block 4 end-to-end. Replace the 501-returning stub routers with real handlers that use Drizzle. All queries must scope by workspace_id from the workspace middleware established in Block 1. Workspace creation (used by signup flows in Blocks 2 and 3) should now seed the 6 default contexts atomically.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 5: People + Projects + Areas CRUD

**Goal**: All three "first-class" entities have full CRUD with the archive lifecycle.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 5
- `docs/schema.md` → "Reference & catalog" + "Outcomes & responsibilities"
- `K-OS Vault/Decisions/0003 - workspace-scoped-schema-for-multi-user-readiness.md`

**Deliverables**:
- Implement `packages/api/src/routes/people.ts`:
  - List, create, get, patch, archive, restore
- Implement `packages/api/src/routes/projects.ts`:
  - List (active + archived sub-tab), create, get, patch, archive (with reason + note), restore
  - Project archive sets `archived_at`, `archive_reason`, `archive_note`, `archived_by`
- Implement `packages/api/src/routes/areas.ts`:
  - Same shape as projects, plus `POST /:id/review` (sets `last_reviewed_at = now()`, `next_review_at` based on cadence)
- Junction-table writes for `project_people` and `area_people` (POST/DELETE links from project/area routes).

**Verification**:
- Archived projects/areas don't appear in list endpoints by default; appear when `?archived=true`.
- Tasks belonging to an archived project are still queryable but the `active_tasks` view (Block 6) will filter them.

**Trigger prompt**:

```
Implement Block 5 of the K-OS implementation plan: "People + Projects + Areas CRUD".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 5: People + Projects + Areas CRUD"
4. "docs/schema.md" — full Reference & catalog and Outcomes & responsibilities sections
5. ADR 0003 (workspace-scoped schema)

Then implement Block 5 end-to-end. Replace the three stub routers (people, projects, areas) with real handlers. Archive flow includes structured reason enum (completed/dropped/paused/replaced), note, archived_at, archived_by — all per the schema doc.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 6: Tasks CRUD + activity log

**Goal**: Full task lifecycle (create / update / status changes / archive / restore / complete) with structured activity events.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 6
- `docs/schema.md` → "Tasks" section + "View patterns"
- `packages/core/src/audit.ts` → `AUDITED_TASK_FIELDS`, `STRUCTURAL_TASK_EVENT_KINDS`, `diffAuditedFields`

**Deliverables**:
- Implement `packages/api/src/routes/tasks.ts`:
  - `GET /` (with filters: status, project_id, area_id, person_id, archived)
  - `GET /today`, `/upcoming`, `/waiting` — codified queries from `docs/schema.md` "View patterns"
  - `POST /` — create, default status `next` unless explicitly `inbox` (from capture)
  - `GET /:id` — full task + tags + activity (last 50 events)
  - `PATCH /:id` — partial update, emits `field_edited` events for any changed audited field via `diffAuditedFields`
  - `DELETE /:id` — hard delete (rare; archive is the usual path)
  - `POST /:id/complete` — sets status='done', completed_at, emits `completed` event
  - `POST /:id/archive` — sets archived_at, emits `archived`
  - `POST /:id/restore` — clears archived_at, emits `restored`
  - `GET /:id/events` — activity feed for this task, paginated
- Create `active_tasks` view via a Drizzle migration (or raw SQL migration) per `docs/schema.md`.
- Task creation emits a `created` event; status changes emit `status_changed`; priority changes emit `priority_changed`.

**Verification**:
- Patching `due_at` on a task creates one `field_edited` event with `payload: { field: 'due_at', from, to }`.
- `GET /today` returns the right tasks for a seeded user.
- Archiving doesn't cascade-delete events.

**Trigger prompt**:

```
Implement Block 6 of the K-OS implementation plan: "Tasks CRUD + activity log".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 6: Tasks CRUD + activity log"
4. "docs/schema.md" — full Tasks section AND the "View patterns" section AND the "Audit configuration" section
5. "packages/core/src/audit.ts" — AUDITED_TASK_FIELDS list and diffAuditedFields helper

Then implement Block 6 end-to-end. The activity-log policy is locked: a fixed list of structural event kinds plus generic `field_edited` events for fields in AUDITED_TASK_FIELDS, generated via diffAuditedFields. The active_tasks view in docs/schema.md needs to land as a SQL migration.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 7: Inbox + recurring task materialisation

**Goal**: Quick-capture endpoint creates `inbox`-status tasks; a scheduled job materialises recurring task instances.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 7
- `docs/schema.md` → "Tasks" (inbox status, recurring fields) + "Triggers / cron jobs"
- `K-OS Vault/Decisions/0006 - routing-tanstack-router.md` (no, irrelevant — strike) — actually replace with:
- `packages/core/src/recurring.ts` → `RecurringRule` type

**Deliverables**:
- Implement `packages/api/src/routes/inbox.ts`:
  - `GET /` — alias for `tasks?status=inbox`
  - `POST /capture` — creates a task with `status='inbox'`, captures source kind/ref, returns the task; AI parse is **not** wired here yet (placeholder hook for Block 18)
  - `POST /:id/triage` — applies optional accepted suggestions, sets status to the user's choice
  - `POST /:id/discard` — archives the inbox item
- Recurring materialisation:
  - `packages/api/src/jobs/materialise-recurring.ts` — function that, given a workspace, finds template tasks (`recurring_rule IS NOT NULL`) and creates instance rows for the next 7 days that don't already exist. Idempotent (use `(parent_recurring_id, scheduled_at)` uniqueness check).
  - SQL migration adding `pg_cron` schedule for nightly run (if Neon supports `pg_cron` on free tier; otherwise use a Vercel cron endpoint).
  - Helper in `packages/core/src/recurring.ts` (or a new `nextOccurrence.ts`) that computes the next N occurrences for a `RecurringRule`.

**Verification**:
- Capture endpoint creates a row with `status='inbox'`, all other fields nullable except title and created_by.
- Recurring template with `kind: 'weekly', weekdays: ['mon']` produces exactly one instance per Monday in the next 7 days, never duplicating.

**Trigger prompt**:

```
Implement Block 7 of the K-OS implementation plan: "Inbox + recurring task materialisation".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 7: Inbox + recurring task materialisation"
4. "docs/schema.md" — Tasks section (inbox status, recurring_rule, parent_recurring_id) AND "Triggers / cron jobs"
5. "packages/core/src/recurring.ts" — RecurringRule type

Then implement Block 7 end-to-end. Inbox is a status, not a separate table (per Q9 of the schema design). AI parse is NOT wired yet — leave a clearly-marked hook for Block 18. Recurring materialisation is idempotent and runs nightly.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

## Phase 3 — UI foundation

### Block 8: Design system primitives port

**Goal**: Port the prototype's `primitives.jsx` components into `packages/ui` as React + CSS Modules.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 8
- `K-OS Vault/Decisions/0004 - styling-vanilla-css-modules-and-radix.md`
- `design/project-north-start/project/primitives.jsx`
- `design/project-north-start/project/styles.css` — for the component styles to port alongside the components
- `packages/ui/src/tokens.css` (already in place)

**Deliverables**:
- For each primitive, a `.tsx` + `.module.css` pair under `packages/ui/src/components/`:
  - `Icon.tsx` — preserves the path map from the prototype
  - `Avatar.tsx` — reads from a `Person`-like type (from `@k-os/core`)
  - `StatusChip.tsx`
  - `PriorityDot.tsx`
  - `CtxBadge.tsx`
  - `PersonChip.tsx`
  - `DateChip.tsx`
  - `TaskRow.tsx`
  - `SectionHead.tsx`
- `packages/ui/src/index.ts` re-exports them all.
- Component CSS uses `var(--token-*)` from `tokens.css` — never hex/RGB literals.

**Verification**:
- `pnpm --filter @k-os/ui typecheck` passes.
- A throwaway preview route in `apps/web` can render a `<TaskRow>` matching the prototype visually.

**Trigger prompt**:

```
Implement Block 8 of the K-OS implementation plan: "Design system primitives port".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 8: Design system primitives port"
4. ADR 0004 (styling: CSS Modules + Radix; no Tailwind/shadcn)
5. "design/project-north-start/project/primitives.jsx" — top to bottom
6. "design/project-north-start/project/styles.css" — at least the rules for .task, .checkbox, .priority-*, .pri-dot, .person-chip, .date-chip, .status, .badge, .ctx-*, .avatar, .section-head — these get ported alongside the components
7. "packages/ui/src/tokens.css" (already in place — CSS variables to consume)

Then implement Block 8 end-to-end. Each primitive becomes a .tsx + .module.css pair. Component CSS uses var(--token-*) from tokens.css — no hex/RGB literals. Re-export from packages/ui/src/index.ts.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 9: App shell + tweaks panel

**Goal**: The 232px sidebar + main shell with the runtime theme/density/accent toggle panel.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 9
- `K-OS Vault/Decisions/0004 - styling-vanilla-css-modules-and-radix.md`
- `K-OS Vault/Decisions/0006 - routing-tanstack-router.md`
- `design/project-north-start/project/screens.jsx` — the App / Sidebar / TopBar components
- `design/project-north-start/project/tweaks-panel.jsx`
- `design/project-north-start/project/styles.css` — `.app`, `.sidebar`, `.main`, `.nav-*`, `.brand-*` rules

**Deliverables**:
- `packages/ui/src/layouts/AppShell.tsx` + CSS module — desktop layout with sidebar + main + optional right rail.
- `packages/ui/src/layouts/Sidebar.tsx` + CSS — nav items mapped from a routes manifest in `packages/core`.
- `packages/ui/src/components/TweaksPanel.tsx` + CSS — Radix Dialog/Popover; toggles `[data-theme]`, `[data-density]`, `[data-accent]` on `<html>`, persists to localStorage.
- `apps/web/src/routes/__root.tsx` — wrap the existing Outlet in `<AppShell>` with the sidebar wired to the route map.
- A `useTweaks` hook in `packages/ui/src/hooks/` that reads/writes the attributes and localStorage.

**Verification**:
- Sidebar renders all primary nav items (Today, Inbox, Upcoming, Waiting, Projects, Areas, People, Review).
- TweaksPanel toggles take effect immediately and survive a page reload.

**Trigger prompt**:

```
Implement Block 9 of the K-OS implementation plan: "App shell + tweaks panel".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 9: App shell + tweaks panel"
4. ADR 0004 (styling) and ADR 0006 (TanStack Router)
5. "design/project-north-start/project/screens.jsx" — the App, Sidebar, TopBar components
6. "design/project-north-start/project/tweaks-panel.jsx" — the Tweaks UI
7. "design/project-north-start/project/styles.css" — .app, .sidebar, .main, .nav-* rules

Then implement Block 9 end-to-end. The tweaks model toggles [data-theme], [data-density], [data-accent] on <html>; tokens.css already has the variables for each. Persist tweak state to localStorage.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

## Phase 4 — Core screens

### Block 10: Today screen

**Goal**: The dated greeting + KPI strip + Focus / Overdue / Due / Followups / Scheduled sections.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 10
- `design/project-north-start/project/screens.jsx` — the Today component
- `design/project-north-start/project/data.js` — sample data for the sections
- `docs/schema.md` → "View patterns" → "Today"

**Deliverables**:
- `apps/web/src/routes/index.tsx` — replaces the current placeholder
- TanStack Query hooks for `GET /api/tasks/today`
- Section components for Focus / Overdue / Due / Followups / Scheduled, each consuming `<TaskRow>` from Block 8
- Click-through navigation to `/tasks/:id` (route created in Block 16; for now the link can be a placeholder)
- Empty states for each section

**Verification**:
- With seed data, the screen matches the prototype visually.
- Sections appear/hide based on whether they have content.

**Trigger prompt**:

```
Implement Block 10 of the K-OS implementation plan: "Today screen".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 10: Today screen"
4. "design/project-north-start/project/screens.jsx" — the Today screen specifically
5. "design/project-north-start/project/data.js" — example task data shaped for Today's sections
6. "docs/schema.md" → "View patterns" → Today

Then implement Block 10 end-to-end. Use TanStack Query for data fetching; reuse the TaskRow primitive from Block 8. Match the prototype layout exactly — section ordering, KPIs, type treatment.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 11: Inbox + Quick Capture

**Goal**: Single-item triage on the Inbox screen + the global ⌘K Quick Capture modal with `/` slash menu.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 11
- `design/project-north-start/project/screens.jsx` — Inbox + QuickCapture components
- `design/project-north-start/project/pickers.jsx` — QC slash menu mechanics
- `design/project-north-start/chats/chat1.md` — the iterations on Quick Capture (slash menu, cross-record search, position fixes)
- `docs/schema.md` → "Tasks" (inbox status, ai_parsed)

**Deliverables**:
- `apps/web/src/routes/inbox.tsx` — single-item triage card with N/S/W/D/Z keyboard shortcuts
- `apps/web/src/components/QuickCapture/` — modal trigger by ⌘K (Radix Dialog), free-form input, slash menu
- Slash menu searches both kinds (person/area/project/timeline) AND records (cross-record per chat iteration)
- AI parse hook is a no-op for now; the captured task lands in inbox as raw text + source. Block 18 wires the actual Anthropic call.
- Triage actions: "next" / "scheduled" / "waiting" / "delegated" / "discard" with optional applied suggestions

**Verification**:
- ⌘K opens the modal, esc closes it, `/` opens slash menu, ↑↓ navigate, ⏎/Tab select.
- Triage moves the task out of inbox and into the chosen status.

**Trigger prompt**:

```
Implement Block 11 of the K-OS implementation plan: "Inbox + Quick Capture".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 11: Inbox + Quick Capture"
4. "design/project-north-start/project/screens.jsx" — Inbox + QuickCapture components
5. "design/project-north-start/project/pickers.jsx" — slash menu pickers
6. "design/project-north-start/chats/chat1.md" — the user iterated heavily on Quick Capture (slash menu cross-record search, label positioning fixes); review the iterations so the final UX is preserved
7. "docs/schema.md" → "Tasks" section (inbox status, ai_parsed field)

Then implement Block 11 end-to-end. AI parse is a no-op stub for now — captured items just land in inbox with the raw text. Block 18 wires the real parse. Keyboard-first UX is non-negotiable: ⌘K, /, ↑↓, ⏎/Tab, esc, N/S/W/D/Z all work.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 12: Upcoming, Waiting, Review screens

**Goal**: The three "future / loose-end" screens.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 12
- `design/project-north-start/project/screens.jsx` — Upcoming, Waiting, Review components
- `design/project-north-start/project/data.js` — sample data for waiting / review

**Deliverables**:
- `apps/web/src/routes/upcoming.tsx` — Tomorrow / This week / Next week / Later sections
- `apps/web/src/routes/waiting.tsx` — Stale / Due today / Upcoming with Nudge action
- `apps/web/src/routes/review.tsx` — 4 surfaces: stale waiting, projects without next action, people with open loops, areas due for review
- Backend endpoints if missing for any of these (extend `/tasks` filters from Block 6 if needed)

**Verification**:
- Each screen renders the right data slice with seed data.
- Stale-waiting threshold matches design (e.g. >7 days = stale).

**Trigger prompt**:

```
Implement Block 12 of the K-OS implementation plan: "Upcoming, Waiting, Review screens".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 12: Upcoming, Waiting, Review screens"
4. "design/project-north-start/project/screens.jsx" — Upcoming, Waiting, Review components
5. "design/project-north-start/project/data.js" — sample data for each

Then implement Block 12 end-to-end. Reuse TaskRow and SectionHead from Block 8 wherever possible. Extend the /tasks API with new filters if specific queries aren't already supported by Block 6.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

## Phase 5 — Detail screens

### Block 13: Projects list + detail

**Goal**: Projects card grid + per-project detail with archive flow.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 13
- `design/project-north-start/project/screens.jsx` — Projects, ProjectDetail, archive modal
- `design/project-north-start/chats/chat1.md` — the archive iterations (reason picker, "out of sight, not gone" copy)
- `docs/schema.md` → "Outcomes & responsibilities" → projects

**Deliverables**:
- `apps/web/src/routes/projects/index.tsx` — card grid, active sub-tab + archived sub-tab
- `apps/web/src/routes/projects/$id.tsx` — detail with header, tasks list, milestones, people sidebar
- Archive modal with reason picker (completed/dropped/paused/replaced) + note + visibility-impact copy
- "Restore" / "Delete forever" from the archived sub-tab
- Project progress shown live (computed from tasks per Q3)

**Verification**:
- Archiving a project hides it from active list; tasks under it disappear from Today (via `active_tasks` view).
- Archived project's tasks remain searchable.

**Trigger prompt**:

```
Implement Block 13 of the K-OS implementation plan: "Projects list + detail".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 13: Projects list + detail"
4. "design/project-north-start/project/screens.jsx" — Projects, ProjectDetail, archive modal
5. "design/project-north-start/chats/chat1.md" — the archive flow iterations
6. "docs/schema.md" → projects table + "View patterns" (active_tasks view + project progress query)

Then implement Block 13 end-to-end. Project progress is computed live from tasks (per schema doc Q3) — never store. Archive modal uses the structured reason enum from the schema.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 14: Areas list + detail

**Goal**: Areas screen + detail with the standard, KPIs, recurring tasks, agent suggestions card.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 14
- `design/project-north-start/project/screens.jsx` — Areas, AreaDetail components
- `docs/schema.md` → "Outcomes & responsibilities" → areas

**Deliverables**:
- `apps/web/src/routes/areas/index.tsx` — area cards with active/archived sub-tabs
- `apps/web/src/routes/areas/$id.tsx` — detail: header (standard quoted in italic, status pills, Review/Archive actions), KPI strip, open tasks / recurring tasks (dashed checkbox affordance) / waiting+delegated, review log, right rail (cadence/owner/context, People with open-loop counts, agent suggestions placeholder)
- Archive flow same shape as projects
- "Mark reviewed" action sets `last_reviewed_at` and computes `next_review_at` from cadence

**Verification**:
- Recurring tasks render with the dashed-checkbox treatment.
- Reviewing an area updates timestamps and emits an event to `task_events`-equivalent log if we add an `area_events` table (defer for now; mention in note).

**Trigger prompt**:

```
Implement Block 14 of the K-OS implementation plan: "Areas list + detail".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 14: Areas list + detail"
4. "design/project-north-start/project/screens.jsx" — Areas + AreaDetail components
5. "docs/schema.md" → areas table

Then implement Block 14 end-to-end. The standard text renders in italic per the design. Recurring tasks get a dashed-checkbox treatment per the prototype. Agent suggestions card renders as a placeholder for now (Block 19 wires the actual call).

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 15: People list + detail

**Goal**: People split-pane (list left, CRM detail right) with "owes you / you owe them / topics" sections.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 15
- `design/project-north-start/project/screens.jsx` — People, PersonDetail components
- `design/project-north-start/project/data.js` — Person sample data (with owesYou/owesThem fields)
- `docs/schema.md` → "Reference & catalog" → people + "View patterns" → "Person open loops"

**Deliverables**:
- `apps/web/src/routes/people/index.tsx` — split layout
- `apps/web/src/routes/people/$id.tsx` — detail with KPIs, "they owe you" / "you owe them" / "topics for next conversation"
- Direction-of-task semantics: "they owe you" = `person_id = X AND owner_id != current user`; "you owe them" = `person_id = X AND owner_id = current user`. Confirm with the schema doc / prototype data.
- Aggregations endpoint `GET /api/people/:id/loops` returning the counts

**Verification**:
- Person detail shows correct counts that match the seed data.
- Topics-for-next-conversation list is a stub for now (becomes AI-driven in Block 19).

**Trigger prompt**:

```
Implement Block 15 of the K-OS implementation plan: "People list + detail".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 15: People list + detail"
4. "design/project-north-start/project/screens.jsx" — People + PersonDetail components
5. "design/project-north-start/project/data.js" — Person fields including openTasks, waiting, owesYou, owesThem
6. "docs/schema.md" → people table + "View patterns" → "Person open loops"

Then implement Block 15 end-to-end. Define the "owes you / you owe them" semantics carefully — the design implies it via owner_id vs person_id. Topics for next conversation is a placeholder stub here; Block 19 wires the AI suggestion.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 16: Task detail + inline pickers

**Goal**: The full task detail page — inline-editable fields, every picker type, activity scroll, comments.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 16
- `design/project-north-start/project/screens.jsx` — TaskDetail component
- `design/project-north-start/project/pickers.jsx` — every picker type
- `design/project-north-start/chats/chat1.md` — the picker iterations (entity name display fix, popover width 340px, label-stacked rows)
- `docs/schema.md` → tasks table

**Deliverables**:
- `apps/web/src/routes/tasks/$id.tsx` — detail page
- Description block: click-to-edit, ⌘⏎ saves, esc cancels, full-width
- Right rail: Status, Priority, Due, Scheduled, Review, Project, Area, Context, Person, Owner, Source, Tags — each clickable, opens picker
- Picker components in `packages/ui/src/components/pickers/`:
  - `ListPicker` (status, priority, context — coloured glyphs)
  - `RecordPicker` (project, area, person — searchable lists with avatars; 340px wide; label stacked above sub)
  - `DatePicker` (calendar + quick presets: Today, Tomorrow, Next week, ...)
  - `TagsPicker` (multi-select chips with "create new")
- Activity log: scrollable cap (~240px), "11 of 47 events · View all" footer
- Comments thread (basic POST event with `kind='commented'`)
- Owner field uses the same Person picker as Person field

**Verification**:
- Every picker opens, narrows, selects, saves, and the field updates without a full reload.
- Activity scrolls inside its cap; comments stay anchored below.
- Editing description from blank state and saving works.

**Trigger prompt**:

```
Implement Block 16 of the K-OS implementation plan: "Task detail + inline pickers".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 16: Task detail + inline pickers"
4. "design/project-north-start/project/screens.jsx" — TaskDetail component
5. "design/project-north-start/project/pickers.jsx" — every picker
6. "design/project-north-start/chats/chat1.md" — picker iterations (label-above-sub layout, 340px popover width)
7. "docs/schema.md" → tasks table

Then implement Block 16 end-to-end. This is the densest UI block — every right-rail field is a clickable picker. Build pickers as reusable components in packages/ui (ListPicker, RecordPicker, DatePicker, TagsPicker). Use Radix Popover/DropdownMenu/Dialog where applicable. Owner uses the same Person picker as the Person field.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

## Phase 6 — Mobile, Intelligence, Polish

### Block 17: Mobile responsive layouts

**Goal**: Mobile-specific layouts for the screens that diverge meaningfully (Today, Inbox, Quick Capture, Task detail).

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 17
- `K-OS Vault/Decisions/0007 - mobile-responsive-pwa-capacitor-deferred.md`

**Deliverables**:
- `packages/ui/src/hooks/useViewport.ts` — returns `'desktop' | 'tablet' | 'mobile'`
- `packages/ui/src/layouts/MobileShell.tsx` — bottom tab bar + full-bleed content + sheets
- Mobile variants where they meaningfully diverge:
  - `Today.mobile.tsx` — vertically stacked, larger tap targets
  - `Inbox.mobile.tsx` + Quick Capture as a full-screen sheet
  - `TaskDetail.mobile.tsx` — sheet-style, swipe-to-dismiss
- Bottom tab bar: Today / Inbox / +Capture / Search / More

**Verification**:
- At 375 px viewport, primary screens render mobile layout; ≥1024 px renders desktop.
- iOS Safari "Add to Home Screen" installs the PWA.

**Trigger prompt**:

```
Implement Block 17 of the K-OS implementation plan: "Mobile responsive layouts".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 17: Mobile responsive layouts"
4. ADR 0007 (responsive PWA, Capacitor deferred)

Then implement Block 17 end-to-end. Branch layouts at the screen level using a useViewport hook — most screens will work as-is at narrow widths, but Today, Inbox, Quick Capture, and Task detail need real mobile variants per the architecture proposal. Don't ship a separate React Native client.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. Commit; don't push without user request.
```

---

### Block 18: AI integration + recurring + PWA polish + launch

**Goal**: Wire up `parseCapture` and `agentSuggestions`, finalise the recurring scheduler, and ship-prep the PWA.

**Read first**:
- `CLAUDE.md`
- `K-OS Vault/Sessions/` (newest note)
- `K-OS Vault/Plans/k-os-todo-implementation.md` → Block 18
- `K-OS Vault/Decisions/0018 - ai-day-one-anthropic-sdk-with-prompt-caching.md`
- `packages/ai/src/parse-capture.ts` (the typed stub)
- `packages/ai/src/agent-suggestions.ts` (the typed stub)
- `K-OS Vault/Patterns/database-branch-strategy.md` (for production migration)
- The skill `claude-api` from the Anthropic Skills bundle — invoke it when implementing Anthropic SDK calls so prompt caching is set up correctly

**Deliverables**:
- Implement `parseCapture` (Haiku 4.5):
  - Builds a system prompt with the workspace catalogue (people, projects, areas, contexts), cached
  - Returns structured `{ suggestedTitle, suggestedFields }`
  - Invoked from `/api/inbox/capture` (Block 11's hook) — stores result in `tasks.ai_parsed`
- Implement `agentSuggestions` (Sonnet 4.6):
  - Per entity kind (task/project/area/person), generates context-aware bullets and structured proposals
  - Cached system prompt + per-entity fresh data
  - Render on the relevant detail pages (Blocks 13–16)
  - "Accept proposal" action applies the suggestion via the relevant API and emits an `agent_acted` event
- Recurring scheduler:
  - Verify the `pg_cron` (or Vercel cron) job from Block 7 is in production
  - Add admin endpoint `POST /api/admin/materialise-recurring` that triggers it manually for debugging
- PWA polish:
  - Verify offline behavior (TanStack Query persistence + service worker)
  - Test PWA install on iOS, Android, desktop Chrome
  - Run Lighthouse, fix any blocker scores
- Production deployment:
  - Set Vercel **Production** env vars to point at the production Neon branch
  - First production migration via `pnpm db:migrate` against production
  - Vercel deploy
  - Smoke test the live app end-to-end

**Verification**:
- Capturing "Pay rent friday $1500" populates `ai_parsed` with `suggestedFields.dueAt`.
- Agent suggestions on a Task detail page surface 2–4 contextually relevant bullets.
- PWA installs and works offline for previously-loaded data.
- Production app at the deployed URL is reachable and signs in.

**Trigger prompt**:

```
Implement Block 18 of the K-OS implementation plan: "AI integration + recurring + PWA polish + launch".

Before doing anything else, read these files in this order:
1. CLAUDE.md
2. The newest note in "K-OS Vault/Sessions/"
3. "K-OS Vault/Plans/k-os-todo-implementation.md" → "Block 18: AI integration + recurring + PWA polish + launch"
4. ADR 0018 (Anthropic SDK with prompt caching)
5. "packages/ai/src/parse-capture.ts" + "packages/ai/src/agent-suggestions.ts" — typed stubs to implement
6. "K-OS Vault/Patterns/database-branch-strategy.md" — for production migration

ALSO invoke the claude-api skill (from the Anthropic Skills bundle) when implementing the Anthropic SDK calls — it will get prompt caching, message shape, and model selection right.

Then implement Block 18 end-to-end. Models are pinned in packages/ai/src/client.ts (Haiku 4.5 for parsing, Sonnet 4.6 for reasoning). Prompt caching is mandatory from day one (per ADR 0018). Confirm the recurring scheduler from Block 7 is healthy. Run Lighthouse and PWA install checks. Deploy to Vercel production once everything is green.

When done, write a session note in "K-OS Vault/Sessions/" and update the Sessions index. This is the launch session — write it like a launch retrospective: what shipped, what we learned, what's now true that wasn't yesterday. Commit; don't push without user request.
```

---

## Block status

Update this table as blocks ship.

| Block | Title | Status | Session note |
|---|---|---|---|
| 1 | Sessions + workspace + auth middleware | ☑ | [[2026-05-09 - block-1-sessions-workspace-auth-middleware]] |
| 2 | Password + magic link auth | ☑ | [[2026-05-09 - block-2-password-and-magic-link-auth]] |
| 3 | Google OAuth + account linking | ☑ | [[2026-05-09 - block-3-google-oauth-and-account-linking]] |
| 4 | Catalog CRUD + workspace seeding | ☑ | [[2026-05-09 - block-4-catalog-crud-and-workspace-seeding]] |
| 5 | People + Projects + Areas CRUD | ☑ | [[2026-05-09 - block-5-people-projects-areas-crud]] |
| 6 | Tasks CRUD + activity log | ☑ | [[2026-05-09 - block-6-tasks-crud-and-activity-log]] |
| 7 | Inbox + recurring task materialisation | ☑ | [[2026-05-09 - block-7-inbox-and-recurring-materialisation]] |
| 8 | Design system primitives port | ☑ | [[2026-05-09 - block-8-design-system-primitives-port]] |
| 9 | App shell + tweaks panel | ☑ | [[2026-05-09 - block-9-app-shell-and-tweaks-panel]] |
| 10 | Today screen | ☑ | [[2026-05-09 - block-10-today-screen]] |
| 11 | Inbox + Quick Capture | ☐ |  |
| 12 | Upcoming, Waiting, Review screens | ☐ |  |
| 13 | Projects list + detail | ☐ |  |
| 14 | Areas list + detail | ☐ |  |
| 15 | People list + detail | ☐ |  |
| 16 | Task detail + inline pickers | ☐ |  |
| 17 | Mobile responsive layouts | ☐ |  |
| 18 | AI integration + recurring + PWA polish + launch | ☐ |  |

## Notes on running the plan

- **Pure-backend blocks (1–7)** can run faster than UI blocks; the user input cycle is mostly "does this query work / does this auth flow login / etc." — short.
- **UI blocks (8–17)** benefit from running with the dev server up so visual diff against the prototype is fast. The prototype's HTML can be opened side-by-side at `design/project-north-start/project/North Star.html` (just open the file; it's self-contained).
- **Don't skip the session-note step** at the end of each block — the next block's trigger prompt depends on reading the most recent session note for current state.
- **If a block uncovers a schema gap**, write a new ADR (or amend `docs/schema.md` with a follow-up note) before continuing. Don't paper over.
