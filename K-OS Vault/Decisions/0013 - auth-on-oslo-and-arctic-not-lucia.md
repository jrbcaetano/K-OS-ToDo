---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - auth
  - security
---

# 0013 — Auth built on `oslo` + `arctic` directly (not Lucia)

## Context

K-OS needs an auth layer that:
- Supports **multiple methods on a single user model**: username + password, magic link, Google OAuth (other providers later).
- Owns its sessions (no JWT, no third-party identity provider tokens) — see [[0017 - sessions-not-jwts]].
- Stores everything in our own Postgres tables for portability.
- Doesn't lock us into a specific framework or runtime.
- Doesn't depend on a specific auth-as-a-service vendor.

The original proposal was **Lucia v3**, which is the canonical TypeScript auth library that solves exactly this problem.

**However**: Lucia v3 was put into **maintenance mode** in 2024 by its author (pilcrow). The author publicly recommended that new projects build directly on Lucia's underlying primitives rather than depend on the (now frozen) library, and provided the [Copenhagen Book](https://thecopenhagenbook.com/) as a spec for doing so.

## Decision

Build session management directly on:

- **`oslo`** — crypto, password hashing (Argon2id via `oslo/password`), token generation, JWT encoding (used internally for some tokens, not for session validation), random number generation
- **`arctic`** — OAuth provider clients (Google to start; Apple, Microsoft, GitHub, etc. drop-in as needed)
- **Custom thin session layer** (~150 LOC) — implements the patterns in the Copenhagen Book: opaque session tokens, `sessions` table, server-side validation per request

Sessions are **not JWTs**. Sessions are opaque random tokens (stored hashed in `sessions(token_hash, user_id, expires_at, ...)`); they are validated by lookup, not by signature verification. This gives us instant revocation (delete the row) and avoids JWT pitfalls (token bloat, no easy revocation, time-bomb risk on key rotation).

## Alternatives considered

- **Lucia v3** — Works today; battle-tested; minimal API. **Rejected** because: in maintenance mode → no security patches, no future-Postgres-driver updates, no new provider support. Locking into a frozen library guarantees a future migration cost. Better to write the ~150 LOC ourselves now while the spec is fresh.
- **Auth.js (NextAuth)** — Largest ecosystem; works outside Next.js too. **Rejected** because: heavy; opinionated about session handling (favors JWTs); database adapters add another layer; coupling to the framework's request lifecycle is awkward in a Hono setup; the abstraction often gets in the way for non-standard flows (account linking on verified email, magic-link with our own SMTP, etc.).
- **Clerk** — Managed; great DX; SDK does everything. **Rejected** because: vendor lock-in (auth tokens, user objects, billing model); commercial pricing kicks in at modest scale; fundamentally fights the portability constraint that drove [[0008 - database-neon-postgres]].
- **WorkOS, Stytch, Supabase Auth, Firebase Auth** — All managed-auth offerings. Same rejection reason as Clerk.
- **Build everything from scratch including OAuth protocol implementations** — **Rejected**: `arctic` is small, well-tested, and replaceable; reimplementing OAuth flows is wasted effort and a security risk.

## Consequences

- **Positive**:
  - We own the entire auth surface — no library to bitrot
  - ~150 LOC of session code; auditable in one sitting
  - Adding new auth methods (Apple, Microsoft, passkeys, etc.) = adding routes + a row in `oauth_accounts`, no library upgrade
  - Sessions are revocable (delete the row); password resets and "log out everywhere" become trivial
  - Same primitives work in any TS runtime (Vercel Node, Cloudflare Workers, Bun, Deno) if we ever migrate
- **Negative**:
  - More code to write than `npm install lucia`
  - More code to **maintain** — security responsibilities sit with us (CSRF, rate-limiting, timing attacks, token rotation)
  - We must follow the Copenhagen Book carefully or risk subtle vulnerabilities (e.g. forgetting to hash the session token before storing)
- **Neutral**:
  - `oslo` and `arctic` are both authored by pilcrow (same person who wrote Lucia). If they go unmaintained too, we have enough of the stack ourselves to swap in alternatives (e.g. Node's built-in `crypto` + a small OAuth lib).

## Implementation notes (for future reference)

The auth tables we need (full schema lives in [[Schema design session]]):

```
users(id, email, email_verified_at?, password_hash?, created_at, ...)
sessions(token_hash PK, user_id FK, expires_at, last_seen_at, ...)
oauth_accounts(provider, provider_user_id PK, user_id FK, email, created_at)
verification_tokens(token_hash PK, user_id?, email?, purpose, expires_at, consumed_at?)
```

`password_hash` and `email_verified_at` are nullable so OAuth-only users don't need a password.

The Copenhagen Book is the spec — implement the session validation, password hashing, and token issuance flows directly from it.

## References

- [[0014 - auth-methods-password-magic-link-google-oauth]]- [[0015 - email-own-smtp-via-nodemailer]]- [[0016 - account-linking-auto-on-verified-email]]- [[0017 - sessions-not-jwts]]- [[0009 - api-hono-on-vercel-serverless]]- [Copenhagen Book](https://thecopenhagenbook.com/)
- [oslo](https://oslojs.dev/)
- [arctic](https://arcticjs.dev/)
- [Lucia v3 maintenance announcement](https://github.com/lucia-auth/lucia/discussions/1714)
