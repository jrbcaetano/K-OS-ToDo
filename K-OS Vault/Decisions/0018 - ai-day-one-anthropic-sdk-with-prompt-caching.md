---
type: decision
status: superseded
superseded-by: "[[0020 - agent-native-architecture-agents-external-to-platform]]"
date: 2026-05-09
tags:
  - decision
  - ai
  - anthropic
  - superseded
---

> [!warning] Superseded by [[0020 - agent-native-architecture-agents-external-to-platform]]
> Reasoning, prompt construction, and provider integration belong in **external agents**, not in the platform. The Anthropic SDK and prompt-caching guidance below remain useful — they apply inside an agent service. The platform itself does not call LLMs. See the new ADR for the authoritative architecture.

# 0018 — AI is day-one: Anthropic SDK with prompt caching from the start

## Context

Reading the Project North Star design (chat transcript and screens) makes one thing clear: **AI is structurally part of the MVP, not a phase-3 add-on.**

The design embeds AI in three places:

1. **Quick Capture** — natural-language parse runs *silently in the background* on every captured item; parsed fields land alongside the raw text in Inbox.
2. **Detail pages** — agent suggestion cards on Task / Area / Person details with proactive next-step suggestions.
3. **Review** — agent activity entries in the review log alongside human activity.

Building MVP without AI means breaking the design and shipping a worse product. So: AI from day one.

The user is already on Anthropic (this conversation, Claude Code, Project North Star generation). Choosing Anthropic continues that ecosystem; tooling like the `claude-api` skill is already aligned.

## Decision

- **SDK**: official Anthropic SDK for TypeScript (`@anthropic-ai/sdk`)
- **Location**: `packages/ai/` — wrappers and prompt definitions, called from Hono routes in `packages/api/`
- **Models**:
  - **Claude Haiku 4.5** for cheap parsing and structured extraction (capture parse, simple classification)
  - **Claude Sonnet 4.6** for reasoning (agent suggestions, summaries)
- **Prompt caching from day one** — the system prompt and context (entity catalog, user preferences) are sent on most calls; caching reduces both latency and cost meaningfully
- **MVP endpoints**:
  - `parseCapture(text) → { title, suggestedFields: { ... } }` — Haiku, runs after capture, before Inbox
  - `agentSuggestions(entityRef) → { bullets: string[] }` — Sonnet, called when a detail page opens

API key stored as `ANTHROPIC_API_KEY` in Vercel env vars.

## Alternatives considered

- **Defer AI to phase 2** — Cheapest MVP. **Rejected**: design depends on AI; shipping without it is shipping a different product.
- **OpenAI / GPT-4 / GPT-5** — Strong models. **Rejected**: ecosystem misalignment (everything else in this project is Anthropic); cost per token is comparable.
- **Mistral / Llama via OpenRouter** — Cheapest. **Rejected**: quality gap matters for user-visible suggestions; MVP isn't the time to optimise pennies.
- **Self-hosted models (Llama on inference server)** — Sovereignty win. **Rejected**: ops burden; quality gap; cost of GPU instances exceeds API spend at our scale.
- **No prompt caching at MVP** — One less thing to set up. **Rejected**: caching pays for itself immediately on the second call; setting it up later is a refactor of every prompt.

## Consequences

- **Positive**: design ships intact; Anthropic ecosystem alignment (`claude-api` skill, prompt-caching tooling); single vendor for AI; pay-as-you-go (no fixed cost)
- **Negative**: tight Anthropic dependency — if pricing or availability changes, swapping providers is a code change in `packages/ai/` (manageable since prompts are isolated); user is responsible for the API key + spend
- **Neutral**: AI calls happen in the API layer ([[0009 - api-hono-on-vercel-serverless]]); no model code runs in the client (avoids exposing the API key)

## Cost notes

- Haiku 4.5: ~$0.25 per million input tokens, $1.25 per million output. Capture parses are tiny (~200 input tokens, ~100 output) — fractions of a cent each.
- Sonnet 4.6: ~$3 / $15 per million. Agent suggestions are larger (~3000 input incl. context, ~500 output) — ~2¢ per call.
- **Prompt caching**: on cache hits, input tokens cost ~10% of base. The system prompt + entity catalog cache hit on every call after the first — drives cost down by ~5x in practice.

Personal-scale estimate: well under $5/mo at MVP usage; double-check post-launch.

## References

- [[0009 - api-hono-on-vercel-serverless]]
- [[K-OS ToDo design — Project North Star|reference_north_star_design (memory)]]
- design/project-north-start/chats/chat1.md (in repo) — the original brief showing AI as embedded
- [Anthropic API docs](https://docs.anthropic.com/)
- [Prompt caching guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
