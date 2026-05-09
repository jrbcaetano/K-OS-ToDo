---
type: index
section: plans
created: 2026-05-09
tags:
  - moc
  - plans
---

# Plans

Implementation roadmaps for K-OS modules. A plan divides a body of work into **session-sized blocks**, each with its own deliverables, vault references to read first, and a self-contained trigger prompt that bootstraps a fresh Claude session straight into that block.

> [!tip] Why these are kept separate from Decisions and Patterns
> Decisions are *what we settled on*. Patterns are *how we keep doing things*. Plans are **work packages** — sequential, finite, deliverables-shaped. A plan's blocks are checked off as they ship and the plan retires when the module is built.

## Conventions

- **One plan per module** (e.g. `k-os-todo-implementation.md` for the ToDo module). Filename is descriptive kebab-case.
- **Required frontmatter**:
  ```yaml
  ---
  type: plan
  module: <module-name>           # 'k-os-todo', etc.
  status: draft | in-progress | complete | superseded
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  tags: [plan, <module-tag>]
  ---
  ```
- **Required structure** per block:
  - **Goal** — one sentence
  - **Read first** — explicit list of vault docs / files to load before implementing
  - **Deliverables** — concrete bullet list
  - **Verification** — how to confirm the block landed correctly
  - **Trigger prompt** — copy-pasteable prompt for a fresh Claude session

## Active plans

- [[k-os-todo-implementation]] — K-OS ToDo MVP, 18 blocks across 6 phases
