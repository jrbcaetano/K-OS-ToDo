---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - data
  - schema
  - multi-user
---

# 0003 — Workspace-scoped schema for multi-user readiness

## Context

K-OS is **single-user today** but the user has stated an explicit constraint: nothing in the foundation should block bringing in additional users later (family or organisation). The form of multi-user collaboration is not decided — it could be shared workspaces (family Plan), team-style sharing (org), or per-resource sharing (Notion-like). Whatever it becomes, the schema should not need migration.

The standard data-model trap: scope everything by `user_id`. That works until two users need to share anything, then every join needs reworking and tags/people/projects need to be deduplicated across users.

## Decision

Every domain row is **scoped by `workspace_id`**, not `user_id`. Two structural tables exist from day one:

```sql
workspaces (id, name, created_at)
workspace_members (workspace_id, user_id, role: 'owner'|'member'|'viewer')
```

On first signup, the system creates **one workspace** for the user and seeds them as the sole `owner`. The UI doesn't expose any workspace switcher until a second workspace exists — single-user feels single-user.

Domain tables (`tasks`, `projects`, `areas`, `people`, `tags`, `inbox_items`, `task_events`) all have `workspace_id` as a non-nullable column with an index. Permissions filter by membership in `workspace_members`.

`Person`, `Project`, `Area`, and `Tag` are **workspace-scoped, not user-scoped within the workspace**. When sharing happens, "Andy" is one row visible to all members — not a per-member duplicate. `created_by` is recorded as soft attribution.

`Task.owner_id` is the user who's accountable for the task (defaults to `created_by`); `Task.person_id` is the stakeholder.

## Alternatives considered

- **User-scoped (just `user_id` everywhere)** — Simplest while single-user. **Rejected**: adding multi-user later requires reworking every query and merging data; a real migration tax.
- **"Add it later when needed"** — Tempting. **Rejected**: by the time it's needed, data exists. Backfilling `workspace_id` and merging duplicates across users is painful and bug-prone.
- **Per-resource sharing (no workspaces, just ACLs)** — Notion-style. **Rejected for now**: more complex; can be layered on workspaces later if needed (per-task ACLs within a workspace).

## Consequences

- **Positive**: schema accommodates family/org sharing without migration; permission primitives are uniform; one query pattern (filter by workspace) instead of two
- **Negative**: extra column on every domain table (small storage cost); single-user UI must always join through workspace_members (negligible perf with proper indexes)
- **Neutral**: when multi-user lands, the work is mostly UI (workspace switcher, member invites) and policy (role enforcement on writes) — schema is already there

## References

- [[0008 - database-neon-postgres]]
- [[0017 - sessions-not-jwts]]
- [[K-OS Platform Vision|project_kos_vision (memory)]]
