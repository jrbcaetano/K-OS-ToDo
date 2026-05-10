---
type: index
section: sessions
created: 2026-05-09
tags:
  - moc
  - sessions
---

# Sessions

Chronological log of working sessions. Each session note captures **what happened, what was decided, what's blocked, and what comes next** — so the next session (yours or another contributor's) can pick up without context-archaeology.

> [!tip] Purpose
> A session note is a handoff to your future self. Write it for the version of you that has forgotten everything in 3 weeks.

## Conventions

- **One note per session.**
- **Filename**: `YYYY-MM-DD - short-title.md` (e.g. `2026-05-09 - architecture-and-stack-decisions.md`). If multiple sessions in one day, append `-1`, `-2`.
- **Required frontmatter**:
  ```yaml
  ---
  type: session
  date: YYYY-MM-DD
  duration: <minutes or hh:mm>
  participants: [Joao, Claude]
  tags: [session, <topic-tags>]
  ---
  ```
- **Required sections**: Goal, Outcomes, Decisions made, Open questions, Next steps.
- Link out generously: any decision made should link to the corresponding ADR in [[Decisions]]; any pattern surfaced should link to [[Patterns]].

## Template

```markdown
---
type: session
date: 2026-05-09
duration: 90m
participants: [Joao, Claude]
tags: [session]
---

# Session title

## Goal
What were we trying to achieve?

## Outcomes
What got done?

## Decisions made
- [[NNNN - decision-title]] — one-line summary
- ...

## Open questions
- ...

## Next steps
- [ ] Specific actionable item
- [ ] ...

## Notes / context
Free-form notes from the session that don't fit elsewhere.
```

## Index

_Newest first._

- 2026-05-10 — [[2026-05-10 - block-11-inbox-and-quick-capture|Block 11 — Inbox + Quick Capture]]
- 2026-05-09 — [[2026-05-09 - block-10-today-screen|Block 10 — Today screen]]
- 2026-05-09 — [[2026-05-09 - block-9-app-shell-and-tweaks-panel|Block 9 — App shell + tweaks panel]]
- 2026-05-09 — [[2026-05-09 - block-8-design-system-primitives-port|Block 8 — Design system primitives port]]
- 2026-05-09 — [[2026-05-09 - block-7-inbox-and-recurring-materialisation|Block 7 — Inbox + recurring task materialisation]]
- 2026-05-09 — [[2026-05-09 - block-6-tasks-crud-and-activity-log|Block 6 — Tasks CRUD + activity log]]
- 2026-05-09 — [[2026-05-09 - block-5-people-projects-areas-crud|Block 5 — People + Projects + Areas CRUD]]
- 2026-05-09 — [[2026-05-09 - block-4-catalog-crud-and-workspace-seeding|Block 4 — Catalog CRUD + workspace seeding]]
- 2026-05-09 — [[2026-05-09 - block-3-google-oauth-and-account-linking|Block 3 — Google OAuth + account linking]]
- 2026-05-09 — [[2026-05-09 - block-2-password-and-magic-link-auth|Block 2 — Password + magic link auth]]
- 2026-05-09 — [[2026-05-09 - block-1-sessions-workspace-auth-middleware|Block 1 — Sessions + workspace + auth middleware]]
- 2026-05-09 — [[2026-05-09 - scaffolding-and-branch-strategy|Scaffolding — monorepo skeleton + branch strategy]]
- 2026-05-09 — [[2026-05-09 - schema-design|Schema design — full data model locked]]
- 2026-05-09 — [[2026-05-09 - initial-planning-architecture-and-stack|Initial planning — architecture, stack, and project bootstrap]]
