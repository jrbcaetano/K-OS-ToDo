---
type: session
date: 2026-05-09
duration: ~2h (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - scaffolding
  - drizzle
  - hono
  - vite
  - neon
  - branching
---

# Scaffolding — monorepo skeleton + branch strategy

> [!success] Outcome in one line
> The repo went from documentation-only to a runnable monorepo skeleton — 59 files, full Drizzle schema, stub API surface, working PWA shell — plus a database-branch operating pattern.

## Goal

Turn the locked architecture and schema into a runnable monorepo skeleton. Every layer of the stack should exist as a real package or app, even if business logic is stubbed. After this session, anyone (you or a future contributor) should be able to `pnpm install`, point at a Neon DB, and get a dev server running.

Then: capture the database-branch operating model as a recurring pattern, since it shapes day-to-day schema work.

## Outcomes

### Scaffolding commit (`0cc971a`, 59 files, 1715 insertions)

- ✅ **Root configuration** — pnpm workspaces, Turborepo, TypeScript project base, ESLint flat config (v9+), Prettier, `.env.example`, `.nvmrc` (Node 22), `packageManager: pnpm@10`
- ✅ **`packages/core`** — fully implemented (no stubs): `enums.ts` (8 enum-shaped const arrays + types), `audit.ts` (AUDITED_TASK_FIELDS + diffAuditedFields helper + structural event kinds), `recurring.ts` (RecurringRule discriminated union)
- ✅ **`packages/db`** — full Drizzle schema (all 17 tables transcribed from `docs/schema.md`), all CHECK constraints, FK relationships, partial indexes; `drizzle.config.ts`; `createDbClient` + `getDb` factories
- ✅ **`packages/api`** — Hono app with logger + CORS, 13 route modules mounted (auth × 4, domain × 7, AI), all returning 501 via shared `stubRouter` helper
- ✅ **`packages/ai`** — Anthropic client factory with model constants (Haiku 4.5, Sonnet 4.6); `parseCapture` and `agentSuggestions` typed stubs
- ✅ **`packages/ui`** — `tokens.css` ported verbatim from `design/project-north-start/project/styles.css`; theme/density/accent attribute selectors preserved; component slot empty until port pass
- ✅ **`apps/web`** — Vite + React 19 + TanStack Router + TanStack Query + vite-plugin-pwa; placeholder Today route at `/`; Vercel adapter at `api/[[...route]].ts` delegating to the Hono app
- ✅ **CI** — GitHub Actions: pnpm install + lint + typecheck + drizzle check on every push and PR
- ✅ **README** — project structure, setup commands, documentation pointers

### Branch strategy commit (`23329a3`, 3 files, 125 insertions)

- ✅ **First Pattern** in `K-OS Vault/Patterns/` — `database-branch-strategy.md` covering the production / dev / test Neon branch layout, the dev → production migration promotion workflow, "Reset from parent" usage, and ephemeral PR branches via Neon's Vercel integration
- ✅ Patterns index updated with an "Ops" sub-section
- ✅ README "Database environments (Neon branches)" section added

### Local validation by Joao (post-commit)

- ✅ `pnpm install` ran cleanly
- ✅ Neon DB created
- ✅ First migration generated and applied (presumed — implied by user feedback)
- ✅ TanStack Router plugin regenerated `routeTree.gen.ts` with the real declaration on first dev run

## Decisions made

These are below-ADR threshold (specific tooling/version/structural choices) but worth recording:

- **Version pins**: React 19 (GA), Vite 6, Drizzle ORM 0.36 + Drizzle Kit 0.28, Hono 4.6, TanStack Router 1.84+ / Query 5.62, oslo 1.2 + arctic 2.2, Anthropic SDK 0.32, TypeScript 5.6, Node 22, pnpm 10. Selected to be late-2024 / early-2026 stable; recent enough for React 19 ecosystem support.
- **ESLint flat config** (`eslint.config.js`) since ESLint 9+ uses flat by default. Plugin: `typescript-eslint` (the unified package).
- **Drizzle column patterns**:
  - Enum-shaped columns use `text('col', { enum: ARRAY })` (TS narrowing) **plus** explicit `check()` constraints in the table builder (DDL enforcement). Both fed by the same `as const` array from `@k-os/core`.
  - Self-reference for `tasks.parent_recurring_id` uses `references((): AnyPgColumn => tasks.id)` to avoid the circular-init issue.
  - Composite primary keys via `primaryKey({ columns: [...] })` in the table callback array (Drizzle 0.32+ array form, not the deprecated object form).
  - Partial indexes use the `.where(sql\`...\`)` chaining pattern.
- **Stub router pattern** (`packages/api/src/routes/_stub.ts`) — single helper that takes an array of `(method, path)` and returns a Hono router responding 501 to each. Keeps the stub blocks tiny and uniform; concrete handlers replace them in place as features land.
- **Vercel adapter shape** — `apps/web/api/[[...route]].ts` exports `config = { runtime: 'nodejs22.x' }` plus `default handle(app)`. Catch-all filename routes everything under `/api/*` to a single function, and Vercel uses Node (not Edge) — required for `oslo` and `nodemailer` per [[0009 - api-hono-on-vercel-serverless]] and [[0015 - email-own-smtp-via-nodemailer]].
- **Vite PWA from day one** with `devOptions: { enabled: false }` — service worker disabled in dev (avoids cache-confusion during HMR), enabled on build. Manifest references the design's accent color (`#5a7a4a`) and paper background (`#fbfbfb`).
- **TanStack Router with `router-vite-plugin`** — file-based route discovery in `src/routes/`, generated `routeTree.gen.ts` is committed (TanStack regenerates on dev/build; the committed copy is a placeholder so `tsc --noEmit` passes pre-first-run).
- **TypeScript build mode** for `apps/web` is `noEmit: true` with Vite handling the actual build. Packages have their own `tsconfig.json` with declaration emission for cross-package types.
- **Inter font** loaded from `rsms.me/inter` via `<link>` in `index.html` — matches what the design prototype assumed. Local self-hosting can come later if needed.

## Decisions deferred (not blocking scaffolding)

- **Vercel-Neon integration** for ephemeral PR branches — captured in the branch-strategy pattern; setup deferred until collaborators or AI-feature PRs make it pay off.
- **CI database for the drizzle check** — currently uses a placeholder URL. When real CI tests land, point this at the `test` Neon branch.
- **Testing framework** — not picked yet. Vitest is the natural choice (Vite-native, fast). Pin when the first test is written.
- **Self-hosting Inter** — ergonomically nice, not necessary at MVP.

## Open questions

- **Did `pnpm install` resolve cleanly?** Implied yes from user feedback ("I've done the needed steps"). If any peer-dep warnings appeared, capture them when next noticed.
- **Did `drizzle-kit generate` produce a clean first migration matching the schema?** Should review the generated SQL once before running broadly — it's the schema-doc-to-code pass's first concrete validation.

## Next steps

The scaffold opens five implementation tracks. In rough priority order:

1. **Auth end-to-end** — replace `/auth/*` stubs with `oslo` + `arctic` real flows. Order: password signup/login → magic link (needs SMTP working) → Google OAuth (needs Google Cloud Console app). This is the gating dependency for everything else; without sessions, no domain mutations are possible.
2. **Core CRUD** — `/tasks`, `/projects`, `/areas`, `/people`, `/contexts`, `/tags` against the Drizzle schema. Workspace-scoping enforced in middleware. Empty-state queries first; mutations second.
3. **Design port** — `primitives.jsx` → `packages/ui/src/components/`; `screens.jsx` → `apps/web/src/routes/`. Order: shell + sidebar → Today → Inbox + Quick Capture → Projects/Areas/People → Task detail → Review.
4. **AI implementation** — wire `parseCapture` (Haiku, called from inbox capture) and `agentSuggestions` (Sonnet, called from detail pages). Prompt caching of the workspace catalog from day one.
5. **Recurring task materialisation** — `pg_cron` job (or Vercel cron) that nightly creates the next 7 days of instances from `recurring_rule` templates.

I'd recommend starting with **(1) auth** because it unblocks everything; the design work in (3) can begin in parallel against fixture data, since component port doesn't need a live API.

## Notes & context

- **The scaffolding session was the largest tool-call burst so far** — 59 files written in four waves. No errors; the file plan from the pre-confirmation message held. One micro-correction post-commit: the user's local TanStack Router plugin regenerated `routeTree.gen.ts` with the real types on first dev run, replacing the committed placeholder. That was expected and acknowledged via system reminder.
- **The branch-strategy pattern was the first Pattern note ever written.** It validates the Pattern template from `Patterns.md` — the template's required sections (Context, Pattern, Example, When not to use, Related) all earned their place. Future patterns can use this one as a model.
- **No new ADRs were written** in this session. Every choice traced back to an existing ADR or stayed below the ADR threshold (versions, naming, helper-function shape).
