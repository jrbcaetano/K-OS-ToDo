---
type: session
date: 2026-05-09
duration: ~4h (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - planning
  - architecture
  - stack
  - auth
  - hosting
  - vault
  - github
---

# Initial planning — architecture, stack, and project bootstrap

> [!success] Outcome in one line
> K-OS went from an empty folder to a structured project with locked architectural decisions, a knowledge vault, and a published GitHub repo — all without writing a line of application code.

## Goal

Bootstrap K-OS from scratch: capture the vision, ground in the existing design, agree the architecture and stack, scaffold the project structure, and connect it to GitHub. No code yet — planning only.

## Outcomes

- ✅ K-OS vision captured in project memory ([[K-OS Platform Vision|project_kos_vision.md]] in `.claude/projects/.../memory/`).
- ✅ Project North Star design bundle fetched from `api.anthropic.com/v1/design/h/…`, extracted to `design/project-north-start/`, and committed to the repo. Chat transcript, React/CSS prototype, design tokens, and canonical sample data all available.
- ✅ Architecture proposal converged through three iterations (design link inaccessible → fetched as gz archive → architecture revised against the actual design → revised again against portability and free-tier constraints).
- ✅ Full stack, hosting, and auth approach locked. See **Decisions made** below.
- ✅ Obsidian vault (`K-OS Vault/`) scaffolded with `Decisions/`, `Patterns/`, `Sessions/` — each with conventions and templates.
- ✅ Project-level `CLAUDE.md` created with K-OS context, vault working agreements, and "what not to do" boundaries.
- ✅ `.gitignore` covering Node, Vercel, Obsidian per-machine state, and Claude local settings.
- ✅ Connected to GitHub at https://github.com/jrbcaetano/K-OS-ToDo and pushed first commit (`26a8a26`).

## Decisions made

ADRs not yet written — these will be ported from project memory (`decision_stack_and_hosting.md`) into formal ADR notes. Forward-references below use the planned ADR numbering.

> [!todo] ADRs to port (next session)
> The decisions captured here are authoritative; the ADRs below are the *form* the rationale will live in once written.

### Project shape

- [[0001 - monorepo-with-pnpm-and-turborepo]] — Monorepo via pnpm workspaces + Turborepo. Modular K-OS apps + shared `core`/`ui`/`db`/`api`/`ai` packages.
- [[0002 - first-app-vite-react-typescript]] — Single Vite + React + TS web app under `apps/web/`, namespaced routes (`/tasks/...`, future `/planner/...`).
- [[0003 - workspace-scoped-schema-for-multi-user-readiness]] — `workspaces` + `workspace_members` exist from day one (single workspace seeded for the user). All domain rows scoped by `workspace_id`. Lets multi-user / family share land later without schema migration.

### Frontend

- [[0004 - styling-vanilla-css-modules-and-radix]] — **Drop Tailwind/shadcn.** Vanilla CSS Modules + `tokens.css` ported from the design's `styles.css`. Radix UI for headless primitives (Dialog, Popover, Combobox, etc.). Rationale: design uses CSS custom properties + `[data-theme]`/`[data-density]` attribute selectors and the user actively edits tokens — Tailwind/shadcn would fight this.
- [[0005 - state-tanstack-query-and-zustand]] — TanStack Query for server state, Zustand for UI slices. No Redux.
- [[0006 - routing-tanstack-router]] — TanStack Router for type-safe client routing.
- [[0007 - mobile-responsive-pwa-capacitor-deferred]] — Single responsive PWA with breakpoint-driven layout modes (desktop = dense Linear-style; mobile = touch-first). Capacitor wrap deferred until native APIs are needed (push, share-extension).

### Backend & data

- [[0008 - database-neon-postgres]] — Neon Postgres, free tier → Launch when live. Plain Postgres. Connection-string portability.
- [[0009 - api-hono-on-vercel-serverless]] — Hono framework, runs as Vercel Node serverless functions. Node runtime (not Edge) because of `oslo` + `nodemailer` Node dependencies.
- [[0010 - orm-drizzle]] — Drizzle + Drizzle Kit. SQL-first migrations, fully portable.
- [[0011 - hosting-vercel-plus-neon-free-tier]] — Vercel Hobby (web + serverless) + Neon Free. Step-up to Vercel Pro $20 + Neon Launch $19 (~$40/mo) when live.
- [[0012 - storage-cloudflare-r2-deferred]] — Cloudflare R2 (S3-compatible, free 10 GB) for files. Deferred until file uploads land.

### Auth

- [[0013 - auth-on-oslo-and-arctic-not-lucia]] — Build directly on `oslo` (crypto, password hashing, tokens) + `arctic` (OAuth clients). Lucia v3 is in maintenance mode; ~150 LOC of session code is preferable to a frozen dependency.
- [[0014 - auth-methods-password-magic-link-google-oauth]] — Three methods supported from day one: username + password (ship first), magic link (ship second), Google OAuth (ship third). Apple/Microsoft/etc. later.
- [[0015 - email-own-smtp-via-nodemailer]] — User's own SMTP server with own domain. SPF/DKIM/DMARC required on sending domain. No Resend/Postmark/SES dependency.
- [[0016 - account-linking-auto-on-verified-email]] — When a new OAuth sign-in matches an existing user's email and the OAuth provider verifies the email (Google always does), auto-link the accounts.
- [[0017 - sessions-not-jwts]] — Opaque session tokens stored in `sessions` table, server-validated per request. Revocable. Argon2id password hashing via `oslo/password`.

### AI

- [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]] — Anthropic SDK in the Hono backend, **prompt caching from day one**. Claude Haiku 4.5 for cheap parsing (e.g. `parseCapture`), Claude Sonnet 4.6 for reasoning (e.g. `agentSuggestions`). Driven by the design — NL parse on capture and agent suggestions on detail pages are part of the MVP, not "phase 3".

### Knowledge base & process

- [[0019 - obsidian-vault-as-knowledge-base]] — `K-OS Vault/` Obsidian vault in the repo with `Decisions/`, `Patterns/`, `Sessions/`. ADRs are append-only (supersede with new ADRs); patterns are editable; session notes are written for future-self.

## Open questions

- **Schema specifics** — formal Drizzle schema for entities (Person, Project, Area, Task, Inbox item) plus auth tables. Need to nail down:
  - Recurring task rule shape (full RRULE vs simpler subset)
  - Activity log granularity (which events get persisted)
  - Whether `Source` is a typed enum + ref or free-form
  - How `inbox_items` relates to `tasks` (separate table vs same table with status)
- **Vercel runtime split** — auth/SMTP routes need Node; can other routes run on Edge for latency? Probably not worth optimizing yet.
- **CI** — set up GitHub Actions now or after first PR? Lean: now, minimal (lint + typecheck + drizzle-kit check).
- **Module boundary inside `apps/web`** — is the K-OS "shell" (sidebar + module switcher) a separate package or just a route group? Lean: route group inside `apps/web` until a second module exists.

## Next steps

- [ ] Write `docs/architecture.md` in the repo — committed source of truth referenced by ADRs and CLAUDE.md.
- [ ] Port the locked decisions above into formal ADR notes in `K-OS Vault/Decisions/` (one note each, sequence 0001–0019).
- [ ] Schema design pass — Drizzle schema for entities + auth tables, reviewed field-by-field before any code.
- [ ] Repo scaffolding — pnpm workspaces, Turborepo, `apps/web` Vite app, `packages/{ui,core,db,api,ai}` skeletons, Drizzle migrations, Hono entry, `oslo`+`arctic` auth wired, design tokens ported into `packages/ui/tokens.css`.
- [ ] **Pre-scaffolding gather**: Google OAuth credentials (Cloud Console), SMTP details (host/port/user/pass/from + SPF/DKIM/DMARC), Anthropic API key.

## Notes & context

- **Design access was non-trivial.** The Claude Design share link returned 403 to WebFetch; Claude in Chrome MCP wasn't connected; eventually the user provided the API export URL (`api.anthropic.com/v1/design/h/…`) which returned a 252 KB gzip archive. Extracted into `design/project-north-start/`. Future projects with Claude Design output: skip the share link, ask for the export URL or the bundle directly.
- **Original architecture proposal had Tailwind + shadcn + Supabase.** Both got dropped after seeing the actual design (CSS-token-driven, runtime-tweakable) and after the user surfaced the portability constraint. The discussion of pros/cons is in the chat transcript; the rationale is captured in [[0004 - styling-vanilla-css-modules-and-radix]] and the rejection of Supabase is implicit in [[0008 - database-neon-postgres]] / [[0011 - hosting-vercel-plus-neon-free-tier]].
- **GitHub repo** is `jrbcaetano/K-OS-ToDo`. Author identity: `Joao Caetano <jrcaetano@gmail.com>` (set per-repo? — actually set globally during this session).
- **Working agreements established** in `CLAUDE.md`:
  - Decisions in `K-OS Vault/Decisions/`, patterns in `K-OS Vault/Patterns/`
  - Sessions summarized in `K-OS Vault/Sessions/` after every session
  - Markdown for notes; Obsidian-flavored where useful (callouts, wikilinks, properties)
