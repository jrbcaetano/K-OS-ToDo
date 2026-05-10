---
type: decision
status: accepted
date: 2026-05-10
tags:
  - decision
  - architecture
  - agents
  - api
  - auth
---

# 0020 — Agent-native architecture: agents are external to the platform

## Context

K-OS is designed for both humans **and** AI agents as first-class operators of the system. Earlier planning (e.g. [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]]) assumed the platform itself would call the Anthropic API to parse captures and generate suggestions. That stance pulls reasoning, prompt construction, and provider choice into the core platform.

A round of architectural review reframed the position: **the platform must not "think."** Agents are independent services that read and write through the platform's public API; they own all reasoning, planning, recommendation, and provider integration. Multiple specialised agents coexist; each can evolve independently. This:

- Prevents complexity bleed into the platform.
- Enables modularity — swapping or adding agents doesn't touch platform code.
- Keeps the frontend lightweight and deterministic.
- Makes scale-out trivial — each agent is its own deployable.

## Decision

K-OS adopts an **agent-native architecture** where the platform exposes a public API and agents are external operators.

### Platform responsibilities (in scope)
- **Data persistence** — workspaces, tasks, events, recurrences, etc.
- **Authentication and authorization** — for both users (sessions per [[0017 - sessions-not-jwts]]) and agents (Agent API keys, this ADR).
- **Workspace scoping** — every request runs against a single workspace; agents cannot see other workspaces' data.
- **Activity logging** — `task_events` records every action with an `actor_kind` discriminator (`user` | `agent` | `system`) so the audit trail distinguishes who did what.
- **Deterministic UI** — frontend renders data from the API; no AI calls from the frontend.

### Agent responsibilities (out of platform scope)
- Reasoning, decisions, recommendations.
- Calling LLM providers (Anthropic, OpenAI, etc.) and constructing prompts.
- Parsing free-form captures, generating suggestions, summarising activity.
- Persisting decisions back through the platform's API (e.g. PATCHing `tasks.ai_parsed`, posting comment events).

### Authentication for agents
- **Phase 1 (MVP)**: workspace-scoped Agent API keys.
  - `agent_keys(id, workspace_id, key_hash, label, scopes?, created_by, created_at, last_used_at, revoked_at)`.
  - Caller passes `Authorization: Bearer <raw-key>`; the auth middleware hashes and looks up.
  - The middleware resolves an `Actor` of kind `'user' | 'agent'`. Domain routes don't care which — they call `c.get('actor')` for audit-stamping.
- **Phase 2 (deferred)**: OAuth / signed requests / per-agent permissions / user approval flows.

### Constraints agents must honour
- Agents access the platform **only through the public API**. No direct DB access. No bypassing the workspace scope.
- Agents persist their decisions through the API — never hold state that the platform can't see.
- Agent actions emit events with `actor_kind = 'agent'` so the activity log accurately attributes work.

## Alternatives considered

- **Embed AI calls in the platform** (the original [[0018]] direction). Rejected: couples the platform to specific providers, mingles deterministic CRUD with stochastic reasoning, makes the API surface non-uniform (some endpoints think, some don't).
- **Frontend-side AI calls.** Rejected: leaks API keys (or requires server-side proxy that defeats the point), can't run while the user is offline, mixes presentation with reasoning.
- **Agent-as-platform-plugin.** Rejected: still couples lifecycle, deployment cadence, and provider choice to the platform. The whole point is independent evolution.

## Consequences

- **Positive**:
  - Platform stays small, audit-able, and stable. The API is the contract.
  - Agents can be written in any language/runtime; replaced wholesale; multiple coexist.
  - Adding a new model provider (or swapping Anthropic → OpenAI) is zero-platform-change.
  - The activity log is rich because agent and user actions both flow through the same write path.
- **Negative**:
  - Slight latency overhead — agents make API calls instead of in-process. Negligible at our scale.
  - Operational footprint increases — at least one extra deployable per agent.
  - Cross-cutting concerns (rate limits, observability) need agent-aware tooling.
- **Neutral**:
  - Existing `agent_suggested` / `agent_acted` event kinds and `task_events.actor_kind = 'agent'` already model this. The schema didn't need to change.

## Implementation notes

- ADR [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]] is **superseded by this ADR**. Anthropic SDK and prompt caching remain valid concerns, but they live inside an agent service, not in the platform.
- `tasks.ai_parsed` (jsonb) stays — agents PATCH it after capture; the platform doesn't fill it.
- The `packages/ai/` workspace package was the seed for an in-platform AI implementation. With this ADR it's removed from the platform; if an example agent is later built, it lives in its own service / repo.
- A future Phase-2 ADR will cover OAuth / signed requests / fine-grained scopes once we have a real second agent.

## References

- [[0009 - api-hono-on-vercel-serverless]]
- [[0017 - sessions-not-jwts]]
- [[0018 - ai-day-one-anthropic-sdk-with-prompt-caching]] *(superseded)*
- [[0003 - workspace-scoped-schema-for-multi-user-readiness]]
