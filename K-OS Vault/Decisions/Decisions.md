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
- [[0003 - workspace-scoped-schema-for-multi-user-readiness]] — _pending_

### Frontend
- [[0004 - styling-vanilla-css-modules-and-radix]] — vanilla CSS Modules + tokens.css + Radix; no Tailwind/shadcn
- [[0005 - state-tanstack-query-and-zustand]] — _pending_
- [[0006 - routing-tanstack-router]] — _pending_
- [[0007 - mobile-responsive-pwa-capacitor-deferred]] — _pending_

### Backend & data
- [[0008 - database-neon-postgres]] — Neon Postgres (free → Launch)
- [[0009 - api-hono-on-vercel-serverless]] — _pending_
- [[0010 - orm-drizzle]] — _pending_
- [[0011 - hosting-vercel-plus-neon-free-tier]] — Vercel + Neon free tier; ~$40/mo step-up
- [[0012 - storage-cloudflare-r2-deferred]] — _pending_

### Auth
- [[0013 - auth-on-oslo-and-arctic-not-lucia]] — own session code on `oslo`+`arctic`; not Lucia
- [[0014 - auth-methods-password-magic-link-google-oauth]] — _pending_
- [[0015 - email-own-smtp-via-nodemailer]] — _pending_
- [[0016 - account-linking-auto-on-verified-email]] — _pending_
- [[0017 - sessions-not-jwts]] — _pending_

### AI
- [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]] — _pending_

### Knowledge base & process
- [[0019 - obsidian-vault-as-knowledge-base]] — _pending_
