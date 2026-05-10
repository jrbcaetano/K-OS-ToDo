---
type: session
date: 2026-05-10
duration: ~2h (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-18
  - agents
  - architecture
  - launch
  - cron
---

# Block 18 — Agent-native pivot + launch prep

> [!success] Outcome in one line
> The plan's "AI lives inside the platform" stance is reversed: K-OS is now an **agent-native** system where reasoning, prompt construction, and provider integration live in external agents that authenticate against the public API with workspace-scoped Agent API keys. The platform stays deterministic. Cron, vercel.json, and env scaffolding land in the same pass.

## What changed in the plan

The original Block 18 was going to wire `parseCapture` (Haiku) and `agentSuggestions` (Sonnet) inside the platform via the `@k-os/ai` package. The user reframed the architecture mid-block:

> The platform must not "think." Agents are external services that read and write through the platform's public API. Multiple specialised agents coexist; each owns its reasoning and provider choice.

The pivot affects every previously-shipped UI placeholder that referenced "AI parse hook (Block 18)" / "agent suggestions (Block 18)" — those copy lines are now inaccurate, since the wiring will never live in-platform. Most platform code didn't actually couple to AI yet (the `@k-os/ai` package was declared but never imported), so the structural cost was small.

A new ADR — [[0020 - agent-native-architecture-agents-external-to-platform]] — codifies this and **supersedes** [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]].

## Outcomes

### Architectural decisions

- ✅ **New ADR `0020`** — agent-native architecture. Lays out platform vs agent responsibilities, Phase-1 Agent API key auth, and the Phase-2 deferral (OAuth / signed requests / scopes).
- ✅ **ADR `0018` superseded** — frontmatter `status: superseded`, banner callout linking to 0020. The Anthropic-SDK / prompt-caching guidance still applies, but inside an agent service.
- ✅ **`docs/architecture.md`** — replaced the "AI" section with an "Agents (out of platform scope)" section. Auth section gained a paragraph on Agent API keys.

### Schema + data layer

- ✅ **Migration `0002_agent_keys.sql`** — `agent_keys(id, workspace_id, key_hash, label, created_by, created_at, last_used_at, revoked_at)`, partial index on `(workspace_id) where revoked_at is null`. Journal updated.
- ✅ **`packages/db/src/schema.ts`** — Drizzle entry for `agentKeys` immediately after `workspace_members`.

### Auth

- ✅ **`packages/api/src/auth/agent-keys.ts`** — `issueAgentKey`, `validateAgentKey`, `revokeAgentKey`, `listAgentKeys`. Tokens are `kos_` + 32 random bytes hex; SHA-256 hashed at rest. `validateAgentKey` returns the key id, the workspace id, the label, and the issuing user id (used as the user-on-record for FKs). On hit it stamps `last_used_at`.
- ✅ **`packages/api/src/middleware/auth.ts`** — auth middleware now accepts EITHER a session cookie (user actor) OR an `Authorization: Bearer kos_…` header (agent actor). Bearer takes precedence over the cookie (explicit beats ambient). Sets a discriminated `Actor` on the context — `{ kind: 'user', userId } | { kind: 'agent', agentId, label, issuedByUserId }`. Two helpers exposed:
  - `actorEventStamp(actor)` → `{ actorKind, actorUserId }` for `task_events` inserts.
  - `actorUserId(actor)` → user id for FKs (the issuing user when called by an agent).
- ✅ Domain routes refactored to use the helpers: **people / projects / areas / tasks / inbox** all stamp `actor_kind` correctly and resolve `created_by` / `owner_id` / `archived_by` to the right user even when an agent is calling.
- ✅ `_tasks-helpers.ts`'s `emitTaskEvent` now takes `actor: Actor` instead of `actorUserId: string | null`, deriving the stamp internally.

### Routes

- ✅ **`packages/api/src/routes/agents.ts`** — `GET /agents` (list active keys), `POST /agents` (issue; returns the raw token EXACTLY ONCE), `DELETE /agents/:id` (revoke). Mutations gated to `actor.kind === 'user'` so an agent can't bootstrap or escalate its own access.
- ✅ **`packages/api/src/routes/cron.ts`** — `POST /cron/materialise-recurring` fans out across workspaces and calls `materialiseRecurring`. Authenticated by `Authorization: Bearer ${CRON_SECRET}`, NOT by `requireAuth`.
- ✅ **`packages/api/src/index.ts`** — `/cron` mounted before `requireAuth`; `/agents` added to `PROTECTED_PREFIXES`. `/ai` mount and `aiRoutes` import deleted.

### Removals

- ✅ **`packages/ai/`** deleted entirely. Was a stub package; never imported by the platform; its mission (LLM calls) now lives outside.
- ✅ **`packages/api/src/routes/ai.ts`** deleted (was a 501-stub).
- ✅ **`@k-os/ai`** removed from `packages/api/package.json` dependencies.
- ✅ Stale comments cleaned: `apps/web/src/screens/Inbox.tsx`, `AreaDetail.tsx`, `People.tsx` placeholder cards now describe the agent-native model instead of pointing at a future "Block 18" wiring.

### Deployment scaffolding

- ✅ **`apps/web/vercel.json`** — declares the `materialise-recurring` cron at `15 4 * * *` daily.
- ✅ **`.env.example`** — removed `ANTHROPIC_API_KEY` (now lives in the agent service); added `CRON_SECRET`; added an agent-native section explaining where provider keys belong.

### Verification

- ✅ `pnpm -r typecheck` — green across `@k-os/core`, `@k-os/db`, `@k-os/ui`, `@k-os/api`, and `apps/web`. The workspace dropped from 7 to 6 (the deletion of `@k-os/ai`).
- ⏳ Live verification deferred to deployment: signup → issue agent key via `POST /agents` → use the key from a separate process to PATCH a task → confirm event stamps `actor_kind = 'agent'`.

## Decisions made

- **Agents borrow the issuing user's id for FKs**: `created_by`, `owner_id`, `archived_by`. The audit trail is still rich because `task_events.actor_kind = 'agent'` distinguishes "the agent did this on Joao's behalf" from "Joao did this directly." Alternative considered (making FKs nullable) was rejected — uniform users-table FKs keep queries simpler.
- **Bearer beats cookie** when both are present. Explicit credentials are unambiguous; the inverse would let an ambient cookie override the agent intent.
- **Issuing/revoking keys is human-only**: agents cannot bootstrap themselves. Phase-2 might allow a key to issue scoped sub-keys, but that's out of scope today.
- **Cron uses a separate static secret**, not an agent key. The cron runner isn't a workspace operator; it's a system actor that fans out across all workspaces. Mixing the auth surfaces would be confusing.
- **Deleted `packages/ai/` rather than parking it**: orphan code rots. If/when an example agent service is built, it's a fresh repo / directory with its own stack.
- **Kept `agent_suggested` and `agent_acted` event kinds** in `STRUCTURAL_TASK_EVENT_KINDS`: these are still relevant — they're how the platform records that an external agent took an action. Agents emit them through `POST /tasks/:id/comment` (or future structured-event endpoints).

## Decisions deferred

- **Per-agent scopes**: today's keys are bearer-style — read/write everything in the workspace. Phase-2 ADR will add scopes (`tasks:read`, `tasks:write`, `events:emit`, etc.) plus user-approval flows.
- **Agent-friendly webhooks**: the cleanest agent UX is "tell me when a task is captured" rather than polling. Webhook delivery (with retry + signing) is a future block once a real agent demands it.
- **Example agent**: a small reference implementation (Inbox parse, e.g.) demonstrating the full loop. Lives outside this repo per ADR 0020.

## Refactor cost summary

The refactor touched 14 files but each change was mechanical:

| Area | Files | Change |
|---|---|---|
| New | 5 | `agent-keys.ts`, `routes/agents.ts`, `routes/cron.ts`, ADR 0020, migration 0002 |
| Auth refactor | 1 | `middleware/auth.ts` — added bearer path + Actor discriminator |
| Helpers | 1 | `_tasks-helpers.ts` — `emitTaskEvent` takes `actor` |
| Domain routes | 5 | people, projects, areas, tasks, inbox — switched to `actorUserId` / stamp |
| Wiring | 1 | `api/index.ts` — drop `/ai`, add `/agents` + `/cron` |
| Deletions | 2 | `packages/ai/`, `routes/ai.ts` |
| Docs | 3 | architecture.md, ADR 0018 frontmatter, ADR 0020 |
| UI copy | 3 | Inbox.tsx, AreaDetail.tsx, People.tsx |

No screens or list flows changed shape. The platform's surface to humans is identical to before; agents now have a parallel, equivalently-typed surface.

## Reflection — what we learned

- **An architectural pivot at Block 18 of an 18-block plan was nearly free.** The reason is the platform never actually called the AI package — Block 7's plan called for it but Block 7 deferred it to Block 18 with a no-op stub. That deferral turned out to be the most valuable accident in the build.
- **The `actor_kind` enum in `task_events` was already the right shape.** Schema designed in Block 6 anticipated agent-distinct event attribution without explicitly modelling agents. ADR 0020 just formalises the answer to "what is `actor_kind = 'agent'` actually supposed to look like in practice."
- **Workspace-scoping pays off again.** Because every domain row carries `workspace_id`, agent keys naturally inherit the same scope without schema changes. No per-row ACL system was needed.
- **`packages/ai` was carried as a future-Block placeholder for too long.** Lesson for future plans: if a package isn't yet imported by anyone, it's not earning its keep — and pivots are cheaper when there's nothing to retract.

## Next steps

The 18-block plan is **complete from the platform's perspective**. The remaining work is operational and out-of-platform:

- [ ] Deploy: set Vercel production env vars (`DATABASE_URL` → production Neon branch, `CRON_SECRET`, SMTP, Google OAuth), run the two new migrations against production, deploy.
- [ ] PWA verify: Lighthouse run, install test on iOS/Android/desktop Chrome.
- [ ] Build a first external agent (e.g. inbox-parse): authenticates with an agent key issued via `POST /api/agents`, polls `/api/inbox`, PATCHes `ai_parsed`, posts a `commented` event with parse rationale.
- [ ] Phase-2 ADR for scopes + signed requests + user-approval flows once a second agent ships.

## Notes & context

- **The `actor_kind = 'system'` value** in the enum is reserved for cron-emitted events (e.g. when the recurring scheduler creates instances on behalf of nobody). The current job doesn't emit `task_events` for materialisations; if it ever does, the stamp is `actor_kind='system'`, `actor_user_id=null`.
- **Agent keys are workspace-scoped, not user-scoped.** Multi-user workspaces (when they land) will share the same keys. If a user-issued key needs to be tied to an individual user (e.g. for revocation when the user leaves), that's a Phase-2 schema addition (a `created_by_revoke_on_user_remove` flag).
- **The platform is "boring infrastructure" by design.** That phrase is a feature, not a critique.
