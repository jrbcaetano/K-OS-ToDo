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

- 2026-05-09 — [[2026-05-09 - scaffolding-and-branch-strategy|Scaffolding — monorepo skeleton + branch strategy]]
- 2026-05-09 — [[2026-05-09 - schema-design|Schema design — full data model locked]]
- 2026-05-09 — [[2026-05-09 - initial-planning-architecture-and-stack|Initial planning — architecture, stack, and project bootstrap]]
