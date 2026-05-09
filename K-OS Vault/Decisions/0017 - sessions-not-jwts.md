---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - auth
  - sessions
  - security
---

# 0017 — Sessions stored in DB, not JWTs

## Context

Once a user authenticates, the server needs to recognise them on subsequent requests. Two broad models:

| Model | How it works |
|---|---|
| **Sessions** | Server issues an opaque token, stores it in a `sessions` table, validates by lookup |
| **JWTs** | Server issues a signed token containing user claims, validates by signature verification (no DB lookup) |

JWTs scale better (no per-request DB hit). Sessions are simpler and revocable.

## Decision

**Use sessions, not JWTs.** Specifically:

- Server generates a random 256-bit token (`oslo/crypto.generateRandomString`)
- Token is hashed (SHA-256) before storage; raw token is sent to the client
- Client stores it in an `httpOnly`, `Secure`, `SameSite=Lax` cookie
- Every authenticated request: hash the cookie value, look up in `sessions` table, check expiry and `revoked_at`
- Session sliding-window: refresh `expires_at` on each successful validation up to a maximum lifetime

`sessions` schema:

```sql
sessions (
  token_hash      TEXT PRIMARY KEY,    -- SHA-256 of the raw token
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at      TIMESTAMPTZ NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL,
  user_agent      TEXT,
  ip_hash         TEXT,                -- hashed for privacy
  revoked_at      TIMESTAMPTZ
);
```

## Alternatives considered

- **JWTs** — Stateless, no DB lookup. **Rejected** because:
  - **Revocation is hard** — once issued, valid until expiry; "log out everywhere" needs a separate block-list (which negates the stateless win)
  - **Token bloat** — claims accumulate; JWTs grow; sent on every request
  - **Key rotation is fragile** — rotating signing keys without breaking active tokens needs a transition period
  - **No "kill switch"** — if a token leaks, you can't immediately invalidate it without that block-list
- **Stateless tokens with short TTL + refresh tokens** — Common middle-ground. **Rejected**: the refresh token is itself a session — needs lookup, hashing, revocation. You're building two systems instead of one.
- **Encrypted cookies (server-decryptable, no DB)** — Like sessions but no DB. **Rejected**: same revocation problem as JWTs; hardly any operational benefit at our scale.

## Consequences

- **Positive**:
  - **Instant revocation** — delete the row, the user's signed out (across all their devices if you delete all their sessions)
  - **"Log out everywhere"** is one DELETE
  - **Audit trail** — `last_seen_at`, `user_agent`, `ip_hash` give visibility into where the account is being used
  - **Simple to reason about** — one source of truth (the `sessions` table)
- **Negative**:
  - One DB query per authenticated request — at our scale, indexed PK lookup is microseconds, not a problem; would matter at 100k QPS
  - Sessions table grows; needs a periodic cleanup job (delete where `expires_at < now() - interval '30 days'`) — `pg_cron` handles this on Neon
- **Neutral**:
  - Sliding-window expiry keeps active users logged in indefinitely (until inactivity); inactive users get logged out cleanly

## Cookie security

- `HttpOnly` — JavaScript can't read it (XSS protection)
- `Secure` — HTTPS only
- `SameSite=Lax` — CSRF protection for state-changing requests; allows top-level navigation from external links
- `Path=/`, `Domain` set to the app's domain

## References

- [[0013 - auth-on-oslo-and-arctic-not-lucia]]
- [[0014 - auth-methods-password-magic-link-google-oauth]]
- [[0009 - api-hono-on-vercel-serverless]]
- [Copenhagen Book — sessions](https://thecopenhagenbook.com/sessions)
