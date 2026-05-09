---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - data
  - database
  - hosting
---

# 0008 — Database: Neon Postgres

## Context

K-OS needs a database that satisfies four constraints simultaneously:

1. **Free tier viable** for personal use indefinitely (single user, sporadic load).
2. **Portable** — explicitly no vendor lock-in. The user must be able to migrate by changing a connection string.
3. **Real RDBMS** — the schema is workspace-scoped (see [[0003 - workspace-scoped-schema-for-multi-user-readiness]]) with foreign keys, transactions, and eventual graph-shaped queries (entity-link model for cross-module connections in future K-OS modules).
4. **Awake-on-demand** — sporadic personal use (a daily-driver app you might not open for a week) shouldn't require manual unpause.

## Decision

**Neon Postgres**, free tier to start; **Neon Launch ($19/mo)** when going commercial.

Drizzle (see [[0010 - orm-drizzle]]) connects via the standard Postgres connection string. Migrations are SQL files versioned in `packages/db/migrations/`.

## Alternatives considered

- **Supabase** — Previously used by user; fastest setup; Postgres + Auth + Storage + Realtime in one. **Rejected** because:
  - Free DB **pauses after 7 days of inactivity** — manual unpause required from the dashboard. Unworkable for a sporadic-use personal app.
  - Auth (custom JWT shape, RLS bound to `auth.uid()`), Realtime channels, and Edge Functions are all lock-in vectors. The user's portability constraint says no.
  - Even using "only Postgres + Auth" still bakes in the auth layer's quirks.
- **Self-hosted Postgres in Docker** — Zero vendor lock-in. **Rejected** because: ops burden (backups, upgrades, monitoring, SSL certs, network exposure for cross-device sync) is unjustified for a personal app.
- **Railway** — Nice DX. **Rejected**: no truly-free Postgres tier as of late 2025 ($5 trial credit only).
- **Render** — Free Postgres. **Rejected**: free tier expires after 90 days, then requires upgrade.
- **PlanetScale** — Removed free tier; MySQL-only (no JSONB, weaker constraint support).
- **CockroachDB Serverless** — 5 GB free, Postgres-compatible. **Considered seriously** but rejected: dialect quirks (no foreign-key chains across regions, different default behaviors); Postgres compatibility is "mostly", not "fully"; Drizzle's CockroachDB support is smaller.
- **Turso (libSQL)** — Generous free tier. **Rejected**: SQLite at heart; the workspace-scoped + activity-log + recurring-task model has heavy relational requirements better served by Postgres.

## Consequences

- **Positive**:
  - Plain Postgres — connection-string portability (move to RDS, Railway, self-host, etc.)
  - **Autosuspend, not pause**: compute suspends after ~5 min idle, wakes in <1s on next query — no manual intervention
  - `pg_cron` available for scheduled jobs (recurring task materialisation)
  - Free tier: 0.5 GB storage, ~191 compute-hours/month — comfortably more than personal use needs
  - **Branching**: Neon allows DB branches (like git branches). Useful for migration testing later.
  - Standard Postgres dialect — Drizzle ORM, pgAdmin, psql all work as expected
- **Negative**:
  - 0.5 GB storage cap on free tier — fine indefinitely for K-OS data, but uploads must go elsewhere (see [[0012 - storage-cloudflare-r2-deferred]])
  - Connection pooling matters in serverless — Neon provides a pooled connection string; must use it
- **Neutral**:
  - Vendor: Neon. Switching to another Postgres host is a connection-string change + `pg_dump | pg_restore`.

## References

- [[0009 - api-hono-on-vercel-serverless]]- [[0010 - orm-drizzle]]- [[0011 - hosting-vercel-plus-neon-free-tier]]
- [[0003 - workspace-scoped-schema-for-multi-user-readiness]]- [Neon docs](https://neon.com/docs)
