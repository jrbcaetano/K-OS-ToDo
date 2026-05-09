---
type: pattern
status: active
domain: ops
created: 2026-05-09
updated: 2026-05-09
tags:
  - pattern
  - ops
  - database
  - neon
---

# Database branch strategy

## Context

K-OS uses Neon Postgres ([[0008 - database-neon-postgres]]), which supports copy-on-write branching at near-zero cost. Without an explicit branch policy, schema-change work tends to drift onto the production branch — risking live data, blocking concurrent migration experiments, and making "did that migration apply cleanly?" answerable only after impact.

The free tier gives **10 branches**, **0.5 GB total storage** (shared, copy-on-write), and **191 compute-hours/month** (also shared, with per-branch autosuspend). More than enough room for a structured branch layout.

## Pattern

Maintain three long-lived branches:

```
production   ← live app data; never run dev migrations against it directly
  └── dev    ← branched from production; pointed at by local .env
  └── test   ← branched from production; pointed at by CI (optional at MVP)
```

Plus optional **ephemeral per-PR branches** via Neon's Vercel integration once collaborators or AI-feature PRs land.

### Operating rules

1. **`production` is the only branch fed to live Vercel deployments.** Set its connection string as `DATABASE_URL` in Vercel's **Production** environment.
2. **Dev work always points at `dev`.** Local `.env` and Vercel **Preview** environment both set `DATABASE_URL` to the `dev` branch's pooled connection string.
3. **Schema changes flow `dev → production`, never the reverse.**
   - Develop on `dev` — `pnpm db:generate` to create migration SQL, `pnpm db:migrate` to apply against `dev`.
   - When migration code is merged to `main` and proven against `dev`, apply the same migration to `production` once. Either temporarily set `DATABASE_URL` to production locally and run `pnpm db:migrate`, or run it through a CI/CD step that reads `DATABASE_URL_PRODUCTION`.
4. **Reset `dev` from `production` when it drifts.** Use Neon's "Reset from parent" action on the dev branch — it discards diverged dev state and reseeds from production's current snapshot. Run `pnpm db:migrate` afterward to reapply any unmerged in-flight migrations.
5. **Use the pooled connection string** (`-pooler` in the host) for all branches. Vercel serverless and Hono Edge-adjacent functions need pooling.

## Example

### Initial setup (first time)

```bash
# In Neon console:
#   1. The default `production` branch already exists.
#   2. Create child branch `dev` from production.
#   3. Optionally create child branch `test` from production for CI.

# Get dev branch's pooled connection string from its page in the Neon console.
# Add to local .env:
DATABASE_URL=postgres://[user]:[pass]@[dev-host]-pooler.neon.tech/neondb?sslmode=require

# Apply existing migrations to the dev branch
pnpm db:migrate
```

### Day-to-day schema change

```bash
# 1. Edit packages/db/src/schema.ts (and update docs/schema.md to match)

# 2. Generate migration (still pointed at dev)
pnpm db:generate
# → creates packages/db/migrations/000N_<name>.sql

# 3. Apply to dev
pnpm db:migrate

# 4. Test the change end-to-end against dev

# 5. Commit migration file + schema.ts + docs/schema.md
git add packages/db/migrations packages/db/src/schema.ts docs/schema.md
git commit -m "schema: <what changed and why>"

# 6. After merge, apply to production
DATABASE_URL=$DATABASE_URL_PRODUCTION pnpm db:migrate
```

### Refresh dev when it's stale

```bash
# In the Neon console, on the `dev` branch page:
#   click "Reset from parent" → confirm.
# Then locally:
pnpm db:migrate                # reapply any migrations on the current branch
                               # that aren't yet in production
```

### Ephemeral PR branches (when collaborators arrive)

Configure Neon's Vercel integration once: **Neon console → Settings → Integrations → Vercel**. Connect the Vercel project. Neon then injects a `DATABASE_URL` per Preview deployment, backed by a fresh branch off `production` that's deleted when the PR closes. The free tier accommodates this comfortably as long as fewer than ~10 PRs are open simultaneously.

## When not to use

- **Pre-launch with no production data yet** — Single-branch (`production` doubling as dev) is fine until the first real user signs up. Branch separation pays off when there's data worth protecting.
- **Non-Neon Postgres hosts** — Self-hosted, RDS, Railway, etc. don't have copy-on-write branching. Fall back to `docker-compose` dev DB or a separate "dev" Postgres instance. The schema-promotion workflow still applies; only the branch creation differs.
- **Single-row playgrounds** — When the change is a one-line column rename being prototyped, a Drizzle migration on dev is overkill. Edit the schema, regenerate, apply — same flow, just faster.

## Related

- [[0008 - database-neon-postgres]] — Why Neon was chosen; portability story
- [[0010 - orm-drizzle]] — Migration generation + application via Drizzle Kit
- [[0011 - hosting-vercel-plus-neon-free-tier]] — Free-tier limits including branches
- Neon docs — [Branching](https://neon.com/docs/introduction/branching), [Reset from parent](https://neon.com/docs/manage/branches#reset-a-branch-from-parent)
