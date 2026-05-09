---
type: index
section: decisions
created: 2026-05-09
tags:
  - moc
  - decisions
---

# Decisions

Architectural decisions for K-OS, captured one note per decision in **ADR style** (Architecture Decision Record).

> [!tip] Why we keep these
> Decisions accumulate. Without a written log, the *why* is lost and old debates get re-litigated. Every meaningful "we chose X over Y" lives here with the reasoning, the alternatives considered, and the constraints at the time.

## Conventions

- **One decision per note.** Don't bundle.
- **Filename**: `NNNN - short-title.md`, zero-padded sequence (e.g. `0001 - monorepo-with-pnpm-and-turborepo.md`). Sequence is global across the vault, not per topic.
- **Required frontmatter**:
  ```yaml
  ---
  type: decision
  status: proposed | accepted | superseded | deprecated
  date: YYYY-MM-DD
  supersedes: [[NNNN - earlier-decision]]   # if applicable
  superseded-by: [[NNNN - later-decision]]  # if applicable
  tags: [decision, <topic-tags>]
  ---
  ```
- **Required sections**: Context, Decision, Alternatives considered, Consequences, References.
- **Append-only.** If a decision changes, write a new ADR that supersedes the old one. Do not edit accepted decisions in place — only update `status` and `superseded-by`.

## Template

```markdown
---
type: decision
status: accepted
date: 2026-05-09
tags: [decision]
---

# NNNN — Short title

## Context
What problem are we solving? What constraints exist?

## Decision
What did we decide?

## Alternatives considered
- **Option A** — pros / cons / why not
- **Option B** — pros / cons / why not

## Consequences
- Positive: ...
- Negative: ...
- Neutral: ...

## References
- [[Related decision]]
- External link: [Title](url)
```

## Index

_Sequence is global. ADRs are append-only — to revise, write a new ADR with `supersedes:` and update this list._

### Project shape
- [[0001 - monorepo-with-pnpm-and-turborepo]] — pnpm workspaces + Turborepo
- [[0002 - first-app-vite-react-typescript]] — React + Vite + TS for `apps/web`
- [[0003 - workspace-scoped-schema-for-multi-user-readiness]] — `workspace_id` on every domain row from day one

### Frontend
- [[0004 - styling-vanilla-css-modules-and-radix]] — vanilla CSS Modules + tokens.css + Radix; no Tailwind/shadcn
- [[0005 - state-tanstack-query-and-zustand]] — TanStack Query for server state, Zustand for UI state
- [[0006 - routing-tanstack-router]] — type-safe SPA routing with validated search params
- [[0007 - mobile-responsive-pwa-capacitor-deferred]] — single responsive PWA, native wrap deferred

### Backend & data
- [[0008 - database-neon-postgres]] — Neon Postgres (free → Launch)
- [[0009 - api-hono-on-vercel-serverless]] — Hono on Vercel Node serverless
- [[0010 - orm-drizzle]] — Drizzle ORM + Drizzle Kit for typed schema and SQL migrations
- [[0011 - hosting-vercel-plus-neon-free-tier]] — Vercel + Neon free tier; ~$40/mo step-up
- [[0012 - storage-cloudflare-r2-deferred]] — Cloudflare R2 when needed; deferred until uploads land

### Auth
- [[0013 - auth-on-oslo-and-arctic-not-lucia]] — own session code on `oslo`+`arctic`; not Lucia
- [[0014 - auth-methods-password-magic-link-google-oauth]] — three methods on one user model
- [[0015 - email-own-smtp-via-nodemailer]] — user's own SMTP via `nodemailer`; SPF/DKIM/DMARC required
- [[0016 - account-linking-auto-on-verified-email]] — auto-link OAuth to existing user when email is verified
- [[0017 - sessions-not-jwts]] — opaque session tokens in `sessions` table, revocable

### AI
- [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]] — Anthropic SDK; Haiku 4.5 + Sonnet 4.6; caching from day one

### Knowledge base & process
- [[0019 - obsidian-vault-as-knowledge-base]] — Obsidian vault at `K-OS Vault/`; ADRs / Patterns / Sessions
