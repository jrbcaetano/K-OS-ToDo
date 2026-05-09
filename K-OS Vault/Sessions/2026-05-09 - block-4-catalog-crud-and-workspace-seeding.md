---
type: session
date: 2026-05-09
duration: ~30m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-4
  - data-layer
  - contexts
  - tags
  - seeding
---

# Block 4 — Catalog CRUD + workspace seeding

> [!success] Outcome in one line
> The first data-layer block lands: contexts and tags have full workspace-scoped CRUD, and every new signup now starts with the 6 default contexts pre-seeded inside the same transaction that creates the workspace.

## Goal

Replace the contexts and tags route stubs with real handlers and extend the workspace creation helper to seed the default catalog. After this block, the magic-link / Google / password signup flows all hand the user a populated palette.

## Outcomes

### Updated helpers

- ✅ **`auth/workspace.ts`** — `createWorkspaceForUserTx` now performs three inserts in the same transaction: `workspaces`, `workspace_members(role='owner')`, and the 6 `DEFAULT_CONTEXTS` rows from `@k-os/core`. Atomic — no signup can leave a workspace without its catalog. Public `createWorkspaceForUser` remains a thin wrapper that opens the transaction; both forms share the seeding code.

### New routes (replaced stubs)

- ✅ **`routes/contexts.ts`** — full CRUD + reorder, all scoped by `workspace_id` from the auth middleware:
  - `GET /` — list contexts in current workspace, ordered by `(sort_order ASC, label ASC)`
  - `POST /` — create. Slug/label/color validated by Zod (slug regex `[a-z0-9](-[a-z0-9])*` ≤40, label ≤40, color `#rrggbb`). `onConflictDoNothing` on `(workspace_id, slug)` → clean 409 on duplicate.
  - `PATCH /:id` — partial update (slug | label | color | sortOrder). Strips `undefined` keys before passing to Drizzle's `.set()` because `exactOptionalPropertyTypes: true` rejects them. 404 if the row isn't in the user's workspace.
  - `DELETE /:id` — hard delete. FK constraints on `tasks/projects/areas/people` are `ON DELETE SET NULL` per the schema doc, so this never errors on linked rows.
  - `POST /reorder` — body `{ order: [{ id, sortOrder }, ...] }`. One transaction, one update per row, all scoped by `workspace_id`. Bounded at 200 entries to avoid pathological payloads.
- ✅ **`routes/tags.ts`** — list / create / patch / delete. Workspace-scoped uniqueness on `name` (trimmed). Same patterns as contexts but simpler — tags have no slug/color/order.

### Verification

- ✅ `pnpm -r typecheck` — green.
- ⏳ Live verification (signup → 6 contexts seeded; rename a context; delete a context with linked tasks → tasks now have `context_id = NULL`) deferred to integration.

## Decisions made

- **Slug regex `^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$`**: lowercase + digits + hyphens, can't start/end with a hyphen, ≤40 chars. Matches the `DEFAULT_CONTEXTS` slug shape and what the URL/UI will accept.
- **Hex color regex `^#[0-9a-fA-F]{6}$`**: 6-digit hex only (no shorthand, no `rgb(...)`). Schema column is `text`; the regex is the only enforcement of "valid color." Fine for MVP — the color picker UI in Block 16 will only emit valid hex.
- **Reorder uses a transaction with one UPDATE per row** rather than a single `CASE WHEN ... END` SQL: cleaner code, ≤200 rows is small, neon-http can batch.
- **Empty-patch → 400** rather than no-op: avoids silently swallowing typos.
- **Strip `undefined` keys before `.set()`**: TS pattern, not a Drizzle quirk. `exactOptionalPropertyTypes: true` is on workspace-wide; this is the first PATCH route and sets the precedent for blocks 5–6.
- **`onConflictDoNothing` + RETURNING** pattern carries over from Block 2's signup. Same idea: clean control flow, no DB-error parsing.

## Next steps

Block 5 (People + Projects + Areas CRUD). The same scoping/Zod/strip-undefined patterns apply directly. Block 5 also adds the archive lifecycle (reason enum + note + `archived_at`/`archived_by`) which is new shape.

## Notes & context

- **Routes are typed `Hono<{ Variables: AuthVariables }>`** so `c.get('workspace')` is type-safe. This is the precedent every domain route from here on follows. The auth middleware applied in `index.ts` is what populates those variables.
- **The DEFAULT_CONTEXTS palette is the single source of truth** for the seeded set. Update it in `packages/core/src/enums.ts` and every new workspace gets the new shape; existing workspaces are untouched.
