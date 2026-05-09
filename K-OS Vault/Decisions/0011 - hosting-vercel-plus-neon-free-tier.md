---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - hosting
  - ops
  - free-tier
---

# 0011 — Hosting: Vercel + Neon (free tier to start)

## Context

K-OS needs a deployment story for both the static web bundle and the Hono API. Constraints:

- **Free to start** — personal-scale use only, single user.
- **Smooth paid step-up** when the app goes commercial / multi-user.
- **Familiar to the user** — Joao has shipped Vercel + Supabase before.
- **No platform lock-in beyond the host's platform itself** — i.e. the API must be portable to a non-Vercel runtime later.
- **CI/CD included** — Git-push deployment.

## Decision

| Concern | Free tier | Step-up |
|---|---|---|
| Web hosting | **Vercel Hobby** | Vercel Pro ($20/mo) |
| API hosting | Vercel serverless functions (same project) | Included in Pro |
| Database | **Neon Free** (see [[0008 - database-neon-postgres]]) | Neon Launch ($19/mo) |
| Storage | Cloudflare R2 free 10 GB (deferred until file uploads land — see [[0012 - storage-cloudflare-r2-deferred]] _(pending)_) | $0.015/GB/mo |
| AI | Anthropic API (pay-as-you-go from day one) | Continues |
| CI | GitHub Actions free tier | Continues |

Total step-up cost when going commercial: **~$40/mo + Anthropic usage**.

## Alternatives considered

- **Supabase + Vercel** (the user's previous combo) — **Rejected**: Supabase free DB pauses after 7 days inactivity; Auth/Realtime/Edge Functions are lock-in vectors. See [[0008 - database-neon-postgres]] for full reasoning.
- **Cloudflare Pages + Workers + Neon** — Generous free tier (100k Worker requests/day, unlimited Pages bandwidth, edge-fast). **Rejected for now** because:
  - Workers' execution model is different enough that the API code becomes less portable to a traditional Node host (no Node `crypto`, restricted `fetch`, no `nodemailer`).
  - The auth setup ([[0013 - auth-on-oslo-and-arctic-not-lucia]]) requires Node primitives — running on Workers would need a parallel implementation.
  - Vercel Hobby's free tier is already plenty for personal scale.
- **Fly.io** — Excellent for full-stack apps. **Rejected**: removed truly-free tier in 2024; $5 trial credit only.
- **Render** — Free web services exist but spin down after 15 min idle, with multi-second cold starts. **Rejected**: cold-start UX is unacceptable for a daily-driver app.
- **Railway** — Nice DX. **Rejected**: $5/mo trial credit is not a real free tier.
- **Self-host on a $5 VPS** — Cheapest at scale. **Rejected**: ops burden (TLS certs, monitoring, backups, OS updates) for a personal app is wrong.

## Consequences

- **Positive**:
  - User keeps the Vercel deployment muscle memory (env vars, dashboard, branch previews)
  - Git-push to deploy; preview URLs on every PR
  - Branch previews against Neon DB branches gives near-prod fidelity
  - Step-up cost is predictable and modest
- **Negative**:
  - **Vercel Hobby is "non-commercial use only"** — when K-OS gains any commercial use (incl. team usage with multiple paying members), Pro is required. This is a clear cliff; budget for it.
  - Serverless cold starts on the API ~1s on first hit after idle. Tolerable for a productivity tool; revisit if it becomes painful.
  - Vercel Functions (Node) have execution-time limits (10s on Hobby, 60s on Pro) — fine for normal API calls; AI calls with tool-use need to stay within bounds or stream.
- **Neutral**:
  - The API code (Hono) is portable — can be redeployed to Cloudflare Workers, Fly, Railway, or self-hosted Node without rewriting business logic. Only the Vercel-specific glue (env, headers, cron config) needs swapping.

## References

- [[0008 - database-neon-postgres]]
- [[0009 - api-hono-on-vercel-serverless]] _(pending)_
- [[0012 - storage-cloudflare-r2-deferred]] _(pending)_
- [Vercel pricing](https://vercel.com/pricing)
- [Neon pricing](https://neon.com/pricing)
