---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - data
  - orm
---

# 0010 — ORM: Drizzle + Drizzle Kit

## Context

Need typed access to Postgres ([[0008 - database-neon-postgres]]) with portable migrations. Constraints:

- **TypeScript-first** schema — types should flow from schema to API without code-gen artefacts
- **SQL-first** migrations — files committed in the repo, applied by a CLI; nothing magical
- **Lightweight** — no separate query engine binary, no shipped runtime dependencies the size of the rest of the app
- **Portable** — works in Node, Bun, Workers (when needed)

## Decision

- **Drizzle ORM** for typed queries
- **Drizzle Kit** for migrations (generates SQL from schema diffs; SQL files committed)
- Schema lives in `packages/db/schema.ts`; migrations in `packages/db/migrations/`

## Alternatives considered

- **Prisma** — Most-used; great DX. **Rejected** because:
  - Ships a binary engine (~30 MB) that fights serverless cold-start budgets
  - Schema language is its own thing (`schema.prisma`), separate from TS — types are generated, not written
  - Heavier in every dimension; overkill for a personal-scale app
- **Kysely** — Just a query builder; very good types. **Rejected**: no schema layer, no migration story — you'd add Drizzle Kit or a separate tool anyway.
- **Raw SQL with `postgres-js`** — Closest to the metal. **Rejected**: no type safety on query results unless you write generic helpers; tedious for normal CRUD.
- **TypeORM, MikroORM, Sequelize** — Older patterns, less actively maintained for serverless contexts.
- **EdgeDB / SurrealDB / DBOS** — Interesting alternatives, but moving away from "plain Postgres" loses the portability win from [[0008 - database-neon-postgres]].

## Consequences

- **Positive**: schema-as-code in TypeScript; migrations are plain SQL committed to the repo (portable to anywhere); types propagate cleanly from schema to API to UI; tiny runtime footprint
- **Negative**: Drizzle's API for advanced queries (CTEs, window functions, complex joins) is more verbose than Prisma's; for the few cases where it matters, drop into raw SQL via `sql\`...\`` template
- **Neutral**: Drizzle Kit's migration generator is solid but occasionally misses subtle changes (e.g. column reordering); review generated SQL before applying

## References

- [[0008 - database-neon-postgres]]
- [[0009 - api-hono-on-vercel-serverless]]
- [Drizzle ORM](https://orm.drizzle.team/)
