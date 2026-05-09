# K-OS Architecture

Canonical architectural overview of **K-OS** — a modular personal life-management platform whose first module is **K-OS ToDo** (Project North Star). Readable end-to-end in 10–15 minutes. Detailed rationale for each decision lives in `K-OS Vault/Decisions/` as ADRs; section headings link out to the relevant ADRs.

> The Obsidian vault is the source of truth for **why**. This document is the source of truth for **what**.

## Status

Phase: **architecture & planning**. No application code yet. Architecture is locked; schema design and scaffolding are next.

## Principles

- **Modular by structure, not just convention.** Each module is a route group + a package set.
- **Portable.** No vendor lock-in beyond the model provider (Anthropic) and a managed Postgres.
- **AI is day-one.** The design embeds AI throughout — NL parse on capture, agent suggestions, agent activity in review.
- **Multi-user-ready, single-user-shipping.** Schema supports workspaces from day one; first ship is single-user.
- **Designed before built.** UI lives in `design/project-north-start/` as React/CSS prototype; production code matches the visual output, not the prototype's internal structure.

## Project shape

K-OS is a **monorepo** managed by pnpm workspaces + Turborepo.

```
k-os/
├── apps/
│   └── web/                # the K-OS shell + Tasks module
├── packages/
│   ├── ui/                 # design tokens + components + screens
│   ├── core/               # shared types, enums, domain helpers
│   ├── db/                 # Drizzle schema + migrations + RLS-style policies
│   ├── api/                # Hono app + route handlers
│   └── ai/                 # Anthropic SDK wrappers + prompts
├── docs/
│   └── architecture.md     # this document
├── design/
│   └── project-north-start/  # source design (the spec)
└── K-OS Vault/             # Obsidian vault (Decisions, Patterns, Sessions)
```

Routes inside `apps/web` are namespaced (`/tasks/...`, future `/planner/...`, `/knowledge/...`) so additional modules don't require new Vite apps.

📎 ADRs: [[0001 - monorepo-with-pnpm-and-turborepo]], [[0002 - first-app-vite-react-typescript]]

## Frontend

| Concern | Choice |
|---|---|
| Framework | React 18+ with TypeScript |
| Build | Vite |
| Routing | TanStack Router |
| Styling | **CSS Modules** + `tokens.css` (ported from design's `styles.css`) |
| UI primitives | Radix UI (headless) — Dialog, Popover, DropdownMenu, Listbox, Combobox |
| Server state | TanStack Query |
| Client/UI state | Zustand |
| Forms | React Hook Form + Zod |
| PWA | Vite PWA plugin (offline-tolerant, installable) |

The styling choice is the most consequential — the design uses CSS custom properties switched by `[data-theme]` and `[data-density]` attribute selectors, with the user actively editing tokens. Tailwind/shadcn would fight this pattern. See ADR for full reasoning.

📎 ADRs: [[0004 - styling-vanilla-css-modules-and-radix]], [[0006 - routing-tanstack-router]] [[0005 - state-tanstack-query-and-zustand]] [[0007 - mobile-responsive-pwa-capacitor-deferred]]
## Backend & data

| Concern | Choice |
|---|---|
| Database | Neon Postgres (free tier → Launch when live) |
| ORM / migrations | Drizzle + Drizzle Kit |
| API framework | Hono |
| Runtime | Vercel Node serverless (not Edge — required for `oslo` and `nodemailer`) |
| Realtime | Postgres `LISTEN/NOTIFY` → WebSocket via Hono (deferred for v1) |
| Cron | `pg_cron` on Neon, or GitHub Actions schedule |
| Storage | Cloudflare R2 (deferred until file uploads land) |

### Data model overview

- **Workspace-scoped from day one** — `workspaces` + `workspace_members` exist with a single seeded workspace; all domain rows have `workspace_id`. Single-user UI for now; family/org sharing without schema migration.
- Domain entities derive from `design/project-north-start/project/data.js`:
  - **Person** — id, name, initials, ctx, role, identity color, KPI rollups (open tasks, owes-you / owes-them, etc.)
  - **Project** — outcome with finish line, archivable with reason (Completed/Dropped/Paused/Replaced)
  - **Area** — standing responsibility with quoted "standard"; cadence; recurring tasks
  - **Task** — status (next/scheduled/waiting/delegated/blocked/someday/done), priority, ctx (boxfusion/praesto/personal/family/health/home), project, area, person, owner, source, due/scheduled/review dates, tags
  - **Inbox item** — captured raw text + source, awaiting triage
  - **Recurring rule** — RRULE-style on a template task; instances reference parent
  - **Activity event** — append-only log per task
- Auth tables (`users`, `sessions`, `oauth_accounts`, `verification_tokens`) layered on the same schema.

📎 ADRs: [[0008 - database-neon-postgres]], [[0010 - orm-drizzle]] [[0009 - api-hono-on-vercel-serverless]] [[0003 - workspace-scoped-schema-for-multi-user-readiness]]
## Auth

Built directly on **`oslo`** (crypto, password hashing, tokens) and **`arctic`** (OAuth clients). Not Lucia — Lucia v3 is in maintenance mode; ~150 LOC of session code is preferable to a frozen dependency.

Methods (rolled out in UI sequentially):

1. **Username + password** — Argon2id via `oslo/password`
2. **Magic link** — own SMTP via `nodemailer` (SPF/DKIM/DMARC required on sending domain)
3. **Google OAuth** — via `arctic`; other providers later

Sessions are opaque tokens in a `sessions` table — server-validated per request, revocable, **not JWTs**.

**Account linking**: auto-link on verified email. Google always verifies emails; new sign-ins matching an existing user's email auto-link to that user.

**Rate limiting** on login via Vercel Middleware (per-IP throttle).

📎 ADRs: [[0013 - auth-on-oslo-and-arctic-not-lucia]], [[0014 - auth-methods-password-magic-link-google-oauth]] [[0015 - email-own-smtp-via-nodemailer]] [[0016 - account-linking-auto-on-verified-email]] [[0017 - sessions-not-jwts]]
## AI

The `packages/ai` package wraps Anthropic SDK calls, invoked from Hono routes.

| Concern | Choice |
|---|---|
| SDK | Anthropic SDK (TypeScript) |
| Models | Claude Haiku 4.5 (cheap parsing), Claude Sonnet 4.6 (reasoning) |
| Prompt caching | **From day one** |
| MVP endpoints | `parseCapture(text)`, `agentSuggestions(entityRef)` |

The design embeds AI structurally — NL parse runs silently on every quick capture, agent suggestion cards appear on detail pages, agent activity is logged in review. AI is part of MVP, not phase 3.

📎 ADRs: [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]]
## Mobile

Single responsive PWA with breakpoint-driven layout modes:

- **Desktop** — dense Linear-style UI (the Project North Star design as drawn)
- **Mobile** — touch-first stack-of-cards / bottom-sheet UI for capture and triage

Native (Capacitor wrap of the same web app) is deferred until a real native need surfaces — push notifications, share-from-other-app, app-store distribution. No separate React Native client; that overhead isn't justified for a single-user product.

📎 ADRs: [[0007 - mobile-responsive-pwa-capacitor-deferred]]
## Hosting & ops

| Concern | Free-tier choice | Step-up (when live) |
|---|---|---|
| Web hosting | Vercel Hobby | Vercel Pro ($20/mo) |
| API hosting | Vercel serverless functions (same project) | (included) |
| Database | Neon Free | Neon Launch ($19/mo) |
| Storage | Cloudflare R2 free 10 GB | Pay per GB |
| AI | Anthropic API (pay-as-you-go) | (continues) |
| CI | GitHub Actions free | (continues) |

Total step-up cost when going commercial: ~**$40/mo** + Anthropic usage.

📎 ADRs: [[0011 - hosting-vercel-plus-neon-free-tier]]

## Working agreements

- **Decisions** in `K-OS Vault/Decisions/` are append-only ADRs (supersede with new ADRs; never edit accepted ones).
- **Patterns** in `K-OS Vault/Patterns/` capture recurring conventions; these are editable.
- **Sessions** are summarised in `K-OS Vault/Sessions/` after every working session.
- Notes are Markdown; Obsidian-flavored where useful (callouts, wikilinks, properties).
- See `CLAUDE.md` at the repo root for the full convention spec.

📎 ADRs: [[0019 - obsidian-vault-as-knowledge-base]]
## What's not decided

- **Schema specifics** — recurring-task rule shape (RRULE vs simpler), activity-log granularity, `Source` typing, separation of `inbox_items` from `tasks`.
- **CI** — likely GitHub Actions (lint + typecheck + drizzle-kit check) but not configured yet.
- **Module boundary inside `apps/web`** — the K-OS shell starts as a route group; promotes to its own package once a second module exists.

For the live list of open questions, see the most recent session note in `K-OS Vault/Sessions/`.

## How to use this document

- **New contributors**: read this top-to-bottom before touching the codebase.
- **Anyone making a meaningful architecture change**: write a new ADR in `K-OS Vault/Decisions/`, then update this document's relevant section.
- **Anyone wondering "why is this like this?"**: every section links to ADRs with full context, alternatives, and consequences.
