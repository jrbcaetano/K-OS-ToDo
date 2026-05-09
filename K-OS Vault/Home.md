---
type: index
project: K-OS
created: 2026-05-09
tags:
  - moc
  - kos
---

# K-OS Vault

Knowledge base, decision log, and working memory for **K-OS** — a modular personal life-management platform. The first module is **K-OS ToDo** (a.k.a. Project North Star).

> [!info] Where things live
> - **Authoritative design**: `../design/project-north-start/` (in the project repo, not the vault)
> - **Locked architectural decisions**: see [[Decisions]]
> - **Recurring patterns and conventions**: see [[Patterns]]
> - **Per-session summaries**: see [[Sessions]]
> - **Implementation roadmaps**: see [[Plans]]

## Sections

- [[Decisions]] — architectural decisions with justification (one note per decision)
- [[Patterns]] — recurring patterns, conventions, and design heuristics
- [[Sessions]] — chronological log of working sessions and their outcomes
- [[Plans]] — implementation roadmaps with session-sized blocks and trigger prompts

## Conventions

- Notes use **Obsidian Flavored Markdown** — frontmatter properties, wikilinks, callouts, embeds.
- Every note has frontmatter with at minimum `type`, `created`, and `tags`.
- Internal references use `[[wikilinks]]`. External references use standard markdown links.
- Decisions are **append-only** — supersede with a new note that links back to the original; do not edit history.

## Status

Architecture, schema, and the monorepo scaffold are in place. **Implementation is next** — see [[k-os-todo-implementation]] for the 18-block plan covering everything from auth to launch.
