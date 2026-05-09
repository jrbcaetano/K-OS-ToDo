---
type: index
section: patterns
created: 2026-05-09
tags:
  - moc
  - patterns
---

# Patterns

Recurring patterns, conventions, and design heuristics that apply across K-OS. Patterns are **prescriptive** — when this situation arises, do it this way.

> [!tip] When to write a pattern
> Write one when you've made the same decision twice and want to make it the third time without thinking. If a rule applies to one place only, it's a decision, not a pattern.

## Conventions

- **One pattern per note.**
- **Filename**: descriptive kebab-case, no sequence (e.g. `error-handling-in-hono-routes.md`, `module-folder-layout.md`).
- **Required frontmatter**:
  ```yaml
  ---
  type: pattern
  status: draft | active | retired
  domain: backend | frontend | data | auth | design-system | ops | other
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  tags: [pattern, <domain-tags>]
  ---
  ```
- **Required sections**: Context, Pattern, Example, When not to use, Related.
- Patterns **can be edited** as understanding deepens (unlike decisions). Use the `updated` field to track changes.

## Template

```markdown
---
type: pattern
status: active
domain: backend
created: 2026-05-09
updated: 2026-05-09
tags: [pattern, backend]
---

# Pattern title

## Context
When does this situation come up?

## Pattern
What's the rule?

## Example
Code or description showing the pattern in action.

## When not to use
Edge cases or situations where the pattern doesn't apply.

## Related
- [[Related pattern]]
- [[Related decision]]
```

## Index

_(Patterns will be added here as they emerge during implementation.)_
