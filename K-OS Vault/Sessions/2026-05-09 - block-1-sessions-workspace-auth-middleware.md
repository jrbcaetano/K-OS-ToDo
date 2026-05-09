---
type: session
date: 2026-05-09
duration: ~1h (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-1
  - auth
  - sessions
  - middleware
  - workspace
---

# Block 1 — Sessions + workspace + auth middleware

> [!success] Outcome in one line
> The auth spine is in place: opaque session tokens (hashed at rest), the workspace creation helper, and a Hono middleware that gates every domain route and exposes typed `user` / `session` / `workspace` accessors.

## Goal

Implement [[k-os-todo-implementation|Block 1]] of the K-OS ToDo plan — stand up the **session lifecycle**, the **workspace primitive**, and the **auth middleware** so that subsequent blocks (Blocks 2–3 mint sessions; Blocks 4+ scope every query by workspace) can build on a single shared authentication surface.

## Outcomes

### New files (`packages/api/src/`)

- ✅ **`auth/sessions.ts`** — `createSession`, `validateSession`, `revokeSession`, `revokeAllForUser`. Tokens are 32 random bytes hex-encoded (256 bits of entropy, via Node's `crypto.randomBytes`); only the SHA-256 hash is persisted in `sessions.token_hash`. Sliding-window expiry: each successful validation refreshes `last_seen_at` and refreshes `expires_at` once the remaining lifetime drops below a 15-day threshold (so we don't write on every request). Idle lifetime constant `SESSION_IDLE_LIFETIME_MS = 30 days`.
- ✅ **`auth/cookies.ts`** — `setSessionCookie` / `clearSessionCookie` using Hono's cookie helpers. `HttpOnly`, `SameSite=Lax`, `Path=/`, `maxAge` from the idle lifetime. `Secure` is gated on `NODE_ENV === 'production'` so `localhost` still works in dev. Cookie name is `k_os_session`.
- ✅ **`auth/workspace.ts`** — `createWorkspaceForUser({ userId, name? })` — wraps both inserts (`workspaces` row + `workspace_members` row with `role='owner'`) in a single `db.transaction`, so we never end up with an orphaned workspace if the membership write fails. Default workspace name: `"Personal"`. Block 4 will extend this to seed the 6 default contexts.
- ✅ **`middleware/auth.ts`** — `requireAuth` Hono middleware via `createMiddleware<{ Variables: AuthVariables }>`. Reads the cookie, validates the session, loads the `users` row, joins `workspace_members → workspaces` for the active workspace, and stores `user`, `session`, `workspace` on the context. Every failure mode returns a generic `401 { error: 'unauthorized' }` so the response doesn't distinguish missing/expired/revoked.
- ✅ **`middleware/workspace.ts`** — `getWorkspace(c)` / `getWorkspaceId(c)` typed accessors. Single source for "what workspace are we operating in?" — every domain query in later blocks routes through these.

### Updated files

- ✅ **`packages/api/src/index.ts`** — Hono instance is now typed as `Hono<{ Variables: AuthVariables }>`. Domain routes (`/tasks`, `/inbox`, `/projects`, `/areas`, `/people`, `/contexts`, `/tags`, `/ai`) are gated behind `requireAuth`. `/auth/*` and `/health` stay public — sessions need to be mintable without a session. Hono's `/tasks/*` matcher doesn't include `/tasks` itself, so each prefix is registered with both forms.
- ✅ **`packages/api/package.json`** — added `drizzle-orm` as a direct dependency. It was previously transitive via `@k-os/db`; the api package now imports `eq` directly from drizzle-orm so it needs to be declared.
- ✅ **`packages/db/src/schema.ts`** — converted `AnyPgColumn` to a type-only import (`import { ..., type AnyPgColumn }`) — `verbatimModuleSyntax: true` in `tsconfig.base.json` rejects mixed type/value imports. This was a latent error from the scaffolding session that surfaced once `pnpm -r typecheck` was run end-to-end.
- ✅ **`packages/db/tsconfig.json`** — removed `drizzle.config.ts` from the `include` list. The config sits outside `rootDir: ./src`, which `tsc --noEmit` rejected. Drizzle Kit doesn't need TS compilation of its config — it loads the file via tsx at runtime.

### Verification

- ✅ `pnpm -r typecheck` — green across `@k-os/core`, `@k-os/db`, `@k-os/api`, `@k-os/ai`, `@k-os/ui`, and `apps/web`.
- ⏳ Live runtime check (cookie → 401, valid session → 501-stub) deferred. Requires a running DATABASE_URL and a manually-inserted `sessions` row; this is the kind of check Block 2 will perform end-to-end the moment the password signup flow exists, since signup is the natural way to mint a session.

## Decisions made

These are below ADR threshold (specific implementation choices — the architectural call sits in [[0017 - sessions-not-jwts]] / [[0013 - auth-on-oslo-and-arctic-not-lucia]]):

- **Token primitive**: `node:crypto.randomBytes(32).toString('hex')` rather than `oslo/crypto.generateRandomString`. Two reasons: (1) Node's crypto is universally stable across Node 22+ runtimes; (2) decouples the session layer from `oslo`'s minor-version churn so `oslo` matters only for password hashing (Block 2). The Copenhagen Book is agnostic about which CSPRNG you use as long as it's a CSPRNG.
- **Hashing primitive**: `node:crypto.createHash('sha256').digest('hex')`. Synchronous, no async overhead per request, and gives us a stable hex string for the PK lookup.
- **Sliding window**: idle lifetime 30 days, refreshed only when remaining lifetime drops below 15 days. Rationale: avoids one DB write per request; still keeps active users logged in indefinitely.
- **`/tasks/*` vs `/tasks`**: Hono's wildcard middleware doesn't match the bare prefix. Solved by registering `requireAuth` against both forms in a small loop. Considered moving the middleware into each route module; rejected because then a new domain route could ship without auth by accident — central registration is the safer default.
- **No "active workspace" header yet**: at MVP, a user has exactly one workspace; the middleware just picks the only row. When multi-user lands, an `X-Active-Workspace` header (or cookie) will pick among memberships. The shape of `loadActiveWorkspace` makes that swap small.
- **No workspace middleware as a separate Hono pass**: the auth middleware already loaded the workspace in the same DB round-trip; adding a second middleware just to expose accessors would have meant either re-querying or threading state through Hono context twice. Instead, `middleware/workspace.ts` is a pure typed accessor module.
- **Generic 401 body** for every auth failure (missing cookie / unknown token / expired / revoked / user-deleted / no-workspace). Avoids an oracle that distinguishes "user exists but session expired" from "no such user". Logs (eventually) will record the specific reason server-side.

## Decisions deferred (not blocking Block 1)

- **Session cleanup job**: per [[0017]], a `pg_cron` task should delete expired/revoked sessions older than 30 days. Defer to Block 7 (which also adds the recurring-task cron). The `sessions_user` partial index already filters revoked rows, so query perf doesn't degrade until the cleanup job lands.
- **Rate-limiting on the auth middleware itself**: not needed — the middleware does an indexed PK lookup. The limit will live on the auth *routes* (signup, login, magic-link request) per Block 2.
- **CSRF mitigation beyond `SameSite=Lax`**: defer until we add cross-origin form posts, which the current single-origin SPA shape doesn't need.

## Open questions

- **Does the live runtime path actually return 401?** Static typecheck is green; the 401 path is small and exercises only the cookie helpers + `validateSession` + an early return. Block 2 will exercise it end-to-end via the signup → login → protected-fetch loop, which is the cheapest way to verify.
- **Does Hono's `db.transaction` work over `neon-http`?** Drizzle's neon-http adapter supports `.transaction()` via Neon's HTTP transaction endpoint (single round-trip). If a runtime issue surfaces in `createWorkspaceForUser`, fallback is to do the two inserts sequentially and accept the (very narrow) orphan-workspace risk.

## Discovered issues (not from Block 1; surfaced while running checks)

- **Root ESLint config is broken** — `eslint.config.js` imports `@eslint/js` but the package isn't declared in the root `devDependencies`. `pnpm --filter @k-os/api lint` errors with `ERR_MODULE_NOT_FOUND`. Pre-existing from the scaffolding session. Fix is one line in root `package.json`; deferred so it lands as its own commit (don't bundle hygiene fixes into a feature commit).
- The `AnyPgColumn` and `drizzle.config.ts` typecheck issues described above were also pre-existing — they only became visible when I ran `pnpm -r typecheck` rather than `pnpm --filter @k-os/api typecheck`. Fixed in this commit because they directly blocked Block 1 verification.

## Next steps

The natural follow-on is **Block 2: Password + magic link auth** ([[k-os-todo-implementation]]). Specifically:

- [ ] Implement `packages/api/src/auth/password.ts` (`oslo/password` Argon2id; `signup`, `verifyPassword`).
- [ ] Wire `POST /auth/password/signup` — creates user, calls `createWorkspaceForUser`, calls `createSession`, calls `setSessionCookie`. This is also the moment Block 1's middleware gets its first real exercise.
- [ ] Wire `POST /auth/password/login` and `POST /auth/password/logout` (logout calls `revokeSession` + `clearSessionCookie`).
- [ ] Magic link flow against `verification_tokens(purpose='magic_link')`.
- [ ] Per-IP rate limiting on the auth routes.

After Block 2, Block 3 layers Google OAuth on top — both share the same `createWorkspaceForUser` + `createSession` plumbing.

## Notes & context

- **The session module is intentionally ~150 LOC**, in line with the rationale in [[0013 - auth-on-oslo-and-arctic-not-lucia]] for owning this code rather than depending on Lucia. Auditable in one sitting.
- **No oslo dependency yet** in this block. `oslo` will earn its keep in Block 2 (`oslo/password` for Argon2id) and Block 3 (`arctic` for Google OAuth).
- **Single source of truth for cookie name**: `SESSION_COOKIE_NAME` is exported from `auth/cookies.ts` and consumed by the middleware. Avoids the classic `'session' vs 'auth_session' vs 'k_os_session'` drift.
- **`AuthVariables` type lives in `middleware/auth.ts`** rather than in a separate `types.ts` — colocates the contract with the producer, and route modules import it as `import type { AuthVariables } from '../middleware/auth'`. When Block 2 starts using `c.get('user')` from inside the password routes, it'll need the same `Hono<{ Variables: AuthVariables }>` declaration.
