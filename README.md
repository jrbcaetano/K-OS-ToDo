# K-OS

A modular personal life-management platform. The first module is **K-OS ToDo** — a calm, premium, keyboard-first task manager (codename: Project North Star).

> **Status**: pre-alpha. Architecture, schema, and decisions are locked. Scaffolding is in place. No application code yet beyond the skeleton.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: React 19 + Vite + TypeScript, TanStack Router + TanStack Query + Zustand, CSS Modules + Radix UI
- **Backend**: Hono on Vercel Node serverless functions
- **Database**: Neon Postgres + Drizzle ORM
- **Auth**: `oslo` + `arctic` (password + magic link + Google OAuth)
- **AI**: Anthropic SDK (Claude Haiku 4.5 + Sonnet 4.6) with prompt caching
- **Hosting**: Vercel (web + API), Neon (DB), Cloudflare R2 (storage, deferred)

See `docs/architecture.md` for the full overview and `K-OS Vault/Decisions/` for the 19 ADRs that back every choice.

## Project structure

```
k-os/
├── apps/
│   └── web/                # Vite + React app (shell + Tasks module)
│       ├── api/[[...route]].ts   # Vercel serverless adapter for the Hono API
│       └── src/            # routes, components, etc.
├── packages/
│   ├── core/               # shared types, enums, audit/recurring helpers
│   ├── db/                 # Drizzle schema + migrations
│   ├── api/                # Hono app (route handlers)
│   ├── ai/                 # Anthropic SDK wrappers
│   └── ui/                 # design tokens + components
├── docs/
│   ├── architecture.md     # canonical architecture overview
│   └── schema.md           # source-of-truth schema spec
├── design/
│   └── project-north-start/  # Project North Star design bundle
└── K-OS Vault/             # Obsidian vault: Decisions, Patterns, Sessions
```

## Getting started

### Prerequisites

- **Node 22+** (`.nvmrc` pins to 22)
- **pnpm 10+** (`packageManager` field pins it)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, ANTHROPIC_API_KEY, SMTP_*, GOOGLE_*, APP_URL, SESSION_SECRET

# 3. Generate and run the first migration
pnpm db:generate
pnpm db:migrate

# 4. Start the dev server
pnpm dev
```

### Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server (web app on `:5173`) |
| `pnpm build` | Build all packages and the web app |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm typecheck` | Run TypeScript checks across the monorepo |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:studio` | Open Drizzle Studio against the configured DB |
| `pnpm format` | Run Prettier across the repo |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — canonical architecture overview
- [`docs/schema.md`](docs/schema.md) — source-of-truth schema spec
- [`K-OS Vault/Decisions/`](K-OS%20Vault/Decisions/) — 19 ADRs (open in Obsidian for backlinks/graph view, or read on GitHub)
- [`K-OS Vault/Sessions/`](K-OS%20Vault/Sessions/) — chronological session log
- [`design/project-north-start/`](design/project-north-start/) — Project North Star design bundle (HTML/CSS/JSX prototype + chat transcripts)
- [`CLAUDE.md`](CLAUDE.md) — project conventions for working with Claude

## License

Personal project, not licensed for redistribution.
