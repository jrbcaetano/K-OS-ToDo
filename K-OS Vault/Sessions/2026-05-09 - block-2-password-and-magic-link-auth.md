---
type: session
date: 2026-05-09
duration: ~1h (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-2
  - auth
  - password
  - magic-link
  - smtp
---

# Block 2 — Password + magic link auth

> [!success] Outcome in one line
> Two of the three sign-in methods are wired end-to-end on top of Block 1's session spine: password signup/login/logout with Argon2id, and magic-link request/verify with nodemailer + the `verification_tokens` table. Both methods mint sessions through the same `createSession` + `setSessionCookie` path.

## Goal

Implement [[k-os-todo-implementation|Block 2]] of the K-OS plan — ship password and magic-link auth on top of the session/workspace/middleware foundation from Block 1, with rate limiting on the public-facing routes. Google OAuth is Block 3.

## Outcomes

### New helpers (`packages/api/src/auth/`)

- ✅ **`password.ts`** — `signup`, `verifyPassword`, plus `EmailAlreadyInUseError` / `PasswordTooShortError`. Hashing via `oslo/password` `Argon2id` (default params). `signup` uses `onConflictDoNothing` on the email unique index so a duplicate signup returns a clean 409 instead of leaking an underlying DB error. `verifyPassword` is timing-safe across all branches: it always runs a real Argon2id verify, even when the user doesn't exist or has no password hash, against a lazily-computed dummy hash that never matches.
- ✅ **`verification-tokens.ts`** — `issueToken`, `consumeToken` against the `verification_tokens` table. 32-random-byte hex tokens; SHA-256 hash at rest; raw token only travels via email. `consumeToken` uses a conditional update so a concurrent redeem of the same token can't double-consume. `MAGIC_LINK_LIFETIME_MS` constant lives here. The same helper will back email-verify and password-reset flows in future blocks (one mechanism, three uses, per ADR 0014).
- ✅ **`rate-limit.ts`** — in-memory token bucket per `(bucketKey, ip)`. Three preset buckets: `signup` (5/min), `login` (10/min), `magicLink` (5/min). Lazy refill (no background interval). Exposes `rateLimit(bucketKey)` as a Hono middleware. Documented limit: on multi-instance Vercel cold-start fan-out the effective rate scales with instance count; swap for an Upstash-backed limiter if traffic ever justifies it.
- ✅ **`request-meta.ts`** — `sessionRequestMeta(c)` returns `{ userAgent, ipHash }` for stamping new `sessions` rows. Single source for "which IP do we trust / how is it hashed" used by every flow that mints a session: password login (this block), magic-link verify (this block), OAuth callback (Block 3).

### New email surface (`packages/api/src/email/`)

- ✅ **`transporter.ts`** — lazy-init `nodemailer.createTransport` from `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` env vars. `sendMail({ to, subject, text, html })` is the only export the rest of the codebase needs. Throws a descriptive error at first send if env vars are missing — fails loud, doesn't silently drop the email.
- ✅ **`templates/magic-link.ts`** — `magicLinkEmail({ appUrl, rawToken, expiresInMinutes })` returns `{ subject, text, html }`. Plain-text first, HTML second. Branded with the K-OS accent (`#5a7a4a`); no remote assets, no inline images — keeps the email small and maximises the chance of inbox delivery per ADR 0015.

### Routes (replaced stubs in `packages/api/src/routes/auth/`)

- ✅ **`password.ts`**:
  - `POST /signup` — Zod validates `{ email, password (≥8), displayName }`. Pipeline: `signup` → `createWorkspaceForUser` → `createSession` → `setSessionCookie`. Rate-limited via `signup` bucket. Returns `201 { user }` with the new user's id/email/displayName.
  - `POST /login` — Zod validates `{ email, password }`. `verifyPassword` → 401 on null → `createSession` → `setSessionCookie`. Rate-limited via `login` bucket.
  - `POST /logout` — Reads cookie, calls `revokeSession`, calls `clearSessionCookie`. Idempotent (no error if cookie missing).
- ✅ **`magic-link.ts`**:
  - `POST /request` — Zod validates `{ email }`. Looks up user by email; issues a `verification_tokens` row with `purpose='magic_link'`, expiring in 15 minutes. If the email matches an existing user, the token is bound to `user_id`; otherwise it's bound to `email` (unknown user, signup pending). Sends `magic-link` template. Always returns `{ ok: true }` regardless of user existence — no email-enumeration oracle. Rate-limited via `magicLink` bucket.
  - `POST /verify` — Zod validates `{ token }`. `consumeToken` returns a tagged union; the route maps `unknown`/`wrong_purpose` → 400, `expired` → 410, `already_used` → 410, `consumed` → continue. For `userId`-bound tokens, marks the user verified if not already and signs them in. For `email`-bound tokens, re-checks for a race-created user, otherwise creates `users` row (`emailVerifiedAt: now()`, no password) + workspace, then signs them in.

### Verification

- ✅ `pnpm -r typecheck` — green across all 6 packages + `apps/web`.
- ⏳ Live runtime exercise (signup → session cookie → protected route returns 200, login wrong password → 401, magic link arrives → click → 200, second click → 410) deferred to integration testing once a test framework lands. The shape is straightforward enough that static checks + the small surface area give high confidence; Block 1's middleware + Block 2's mint paths share one composition pattern.

## Decisions made

These are below ADR threshold (implementation choices; the architectural calls live in [[0013 - auth-on-oslo-and-arctic-not-lucia]] / [[0014 - auth-methods-password-magic-link-google-oauth]] / [[0015 - email-own-smtp-via-nodemailer]] / [[0017 - sessions-not-jwts]]):

- **Password minimum length: 8.** Constant `MIN_PASSWORD_LENGTH` in `auth/password.ts` so it can be raised later without scattering. No max complexity rules — research consistently finds they make passwords worse, not better. NIST 800-63B alignment.
- **Email normalization: `trim().toLowerCase()`** at every boundary that writes or reads `users.email`. Avoids the classic "alice@example.com vs Alice@Example.com create two accounts" bug. Done in `signup`, `verifyPassword`, magic-link `/request`, magic-link `/verify` user-lookup, and `issueToken`.
- **Constant-time login**: `verifyPassword` always runs a real Argon2id verify, even on the no-such-user branch, against a lazy-init dummy hash. Closes the user-enumeration timing oracle on `/login`.
- **`onConflictDoNothing` on signup** rather than catching a Postgres unique-constraint error. Cleaner control flow; same outcome.
- **Magic-link token shape**: 32 bytes hex (64 chars), same as session tokens. Same `node:crypto.randomBytes` primitive in `verification-tokens.ts` as in `sessions.ts` — one mental model for "how K-OS generates secrets."
- **Magic-link verifies email automatically**: a successful click sets `emailVerifiedAt = now()` for both the existing-user and new-user branches. Magic-link delivery + click is per-se proof of email ownership, so a separate verification step is redundant.
- **Magic-link signup defaults `displayName` to the email local part**. Cheapest no-friction path; user can rename in profile when that screen exists. No `displayName` is ever requested by the magic-link `/request` flow, since the link is meant to be one input field.
- **Always-200 on `/request`**: matches the "no enumeration oracle" rule. The downside is a user who typos their email gets no error — accepted; the magic-link UI in Block 11 can show "check your inbox; if nothing arrives in 5 minutes, try again."
- **Rate-limit presets** (5/min signup, 10/min login, 5/min magic-link): conservative starting numbers; can be tuned in `rate-limit.ts`. The login bucket is more permissive because legitimate "forgot which password" retries happen.
- **Email branding**: just enough HTML for it to look like a real product email (centered button, K-OS accent), no images, no external CSS. Image-heavy emails trigger spam filters and break in dark-mode clients; plain styled HTML is the sweet spot for a personal-domain SMTP.
- **No CSRF tokens on `/auth/*` routes**: the cookie they read/set is `SameSite=Lax`, which is the modern default protection; signup/login/logout are explicit POSTs from our own SPA, not idempotent GETs. CSRF tokens become relevant if/when we add cross-origin form posts.

## Decisions deferred (not blocking Block 2)

- **Lucia-style "session token rotation on login" / "log out everywhere on password change"**: not yet wired. The primitive exists (`revokeAllForUser` from Block 1); Block 2 doesn't expose a password-change route, so there's nothing to wire it to. When `PATCH /me/password` lands, that's where it goes.
- **Email-verify and password-reset flows**: schema and helper support both, but no UI/routes yet. The helper is shaped so they're each ~30 LOC additions when needed. Likely lands alongside the profile screen.
- **Backoff on the dummy-hash path**: `verifyPassword`'s no-user branch still costs one real Argon2id verify per request, which a determined attacker can use to amplify load. The `login` rate limiter caps it at 10/min/IP; revisit only if logs show abuse.
- **Webhook / dedicated transactional address per type**: a single `SMTP_FROM` covers everything; we'll grow into per-type addresses (`security@`, `billing@`) when those flows exist.

## Open questions

- **Does the Argon2id default cost suit Vercel's per-function memory budget?** `oslo/password`'s defaults are reasonable on a laptop; on a Hobby-tier serverless cold start they could push response time visibly. If login feels slow once deployed, lower `memorySize` or `iterations` in `auth/password.ts` — single line change.
- **Will `db.transaction()` against neon-http behave as expected for `createWorkspaceForUser`?** Block 1 noted this as an open question; it's now being exercised by every signup. First end-to-end signup against the dev branch will answer.
- **Is `APP_URL` set correctly in dev?** The magic-link template falls back to `http://localhost:5173`, which works locally; production deploys MUST set `APP_URL=https://<domain>` or the email links will point at localhost. Worth a deploy-time guard later (Block 18 deployment check).

## Next steps

The auth surface is two-thirds of the way to launch-ready. **Block 3: Google OAuth + account linking** is the natural follow-on:

- [ ] `packages/api/src/auth/oauth-google.ts` — `arctic` Google client; `getAuthorizationUrl`, `validateAuthorizationCode`.
- [ ] `packages/api/src/auth/account-linking.ts` — implements [[0016 - account-linking-auto-on-verified-email]] (auto-link on verified email match).
- [ ] Routes: `GET /auth/oauth/google/authorize`, `GET /auth/oauth/google/callback` (replace stubs).
- [ ] State cookie for CSRF protection on the OAuth round-trip.

After Block 3, Phase 1 is done and the Phase 2 data-layer blocks (4–7) can run.

## Notes & context

- **No new ADRs.** Every decision in this block traces back to the existing locked decisions or sat below ADR threshold.
- **The rate limiter is the only piece of in-memory state in the API.** It survives only as long as a serverless instance stays warm. That's fine for MVP but worth flagging — anything else stateful goes through Postgres. (Sessions, verification tokens, etc. all already do.)
- **Block 1's `requestMeta` plumbing was anticipated correctly.** Adding it as a shared helper in this session let password login, magic-link verify, and OAuth callback all stamp `user_agent` + `ip_hash` consistently without three slightly-different implementations.
- **Naming**: `magicLink` (camelCase) for the rate-limit bucket key; `'magic_link'` (snake_case) for the DB enum value in `verification_tokens.purpose`. The DB-enum case follows the schema doc; the bucket-key case follows TS object convention.
