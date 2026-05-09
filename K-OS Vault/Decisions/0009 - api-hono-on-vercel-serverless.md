---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - backend
  - api
  - hosting
---

# 0009 — API: Hono on Vercel Node serverless

## Context

The K-OS web app needs an HTTP API that handles auth, data CRUD, and AI calls. Constraints:

- **Type-safe** end-to-end with the frontend (shared types from `packages/core` and `packages/db`)
- **Lightweight** — no enterprise framework overhead for a personal-scale app
- **Portable** — must run on Vercel today, but should be easy to lift to Cloudflare Workers, Bun, Node, or self-hosted if hosting changes
- **Node primitives required** — auth uses `oslo` (Argon2id, crypto) and `nodemailer` (SMTP), neither of which run on Edge runtimes

## Decision

- **Framework**: Hono
- **Runtime**: Vercel Node serverless functions (not Edge)
- **Location in monorepo**: `packages/api/` (the Hono app, framework-agnostic) consumed by `apps/web/api/[[...route]].ts` (the Vercel adapter)

The `packages/api/` Hono app is independently runnable — it can be served by `bun`, `node`, or `wrangler` in dev or alternative deployments without changing the routes themselves.

## Alternatives considered

- **Next.js API routes** — Tied to Next.js (which we rejected in [[0002 - first-app-vite-react-typescript]]).
- **Express** — Heavyweight, ageing API, callback-style patterns. **Rejected**: Hono is faster, smaller, modern.
- **Fastify** — Solid; good types. **Rejected**: heavier than Hono; less portable across runtimes (Node-centric).
- **tRPC** — Excellent type safety; clients call server procedures. **Rejected because**: couples the client and server tightly, makes the API harder to consume from a future native client (Capacitor or RN) or third-party tools; we keep REST-shaped routes for portability.
- **GraphQL (Apollo, Yoga, etc.)** — Overkill for personal-scale; query complexity overhead.
- **Vercel Edge runtime** — Faster cold starts, global. **Rejected**: incompatible with `oslo` and `nodemailer`. We could split routes (auth on Node, the rest on Edge) but the operational complexity isn't worth the latency win for a personal app.

## Consequences

- **Positive**: portable to any TS runtime (Workers, Bun, Deno, Node); minimal overhead; type-safe with Zod validators; framework-agnostic routes
- **Negative**: cold starts on Vercel Hobby ~1s for the first hit after idle (improves on Pro, mostly fine for a productivity tool)
- **Neutral**: Vercel's serverless function model means each route is a Lambda — DB connection pooling matters (use Neon's pooled connection string)

## References

- [[0002 - first-app-vite-react-typescript]]
- [[0008 - database-neon-postgres]]
- [[0011 - hosting-vercel-plus-neon-free-tier]]
- [[0013 - auth-on-oslo-and-arctic-not-lucia]]
- [[0015 - email-own-smtp-via-nodemailer]]
- [Hono](https://hono.dev/)
