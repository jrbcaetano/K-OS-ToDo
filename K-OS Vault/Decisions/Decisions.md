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

_(Decisions will be added here as they are written. The locked decisions captured during the planning phase live in project memory at `.claude/projects/.../memory/decision_stack_and_hosting.md` and should be ported into ADR notes here when convenient.)_
