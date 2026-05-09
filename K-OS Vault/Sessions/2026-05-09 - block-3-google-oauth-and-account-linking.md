---
type: session
date: 2026-05-09
duration: ~45m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-3
  - auth
  - oauth
  - google
  - account-linking
---

# Block 3 — Google OAuth + account linking

> [!success] Outcome in one line
> Phase 1 closes: the third sign-in method (Google) is wired with PKCE + state-cookie protection, and the account-linking policy from ADR 0016 lives in a single provider-agnostic module that future Microsoft/Apple/GitHub clients will reuse without changes.

## Goal

Implement [[k-os-todo-implementation|Block 3]] of the K-OS plan — add Google as the third sign-in method, with the account-linking policy from [[0016 - account-linking-auto-on-verified-email]] applied at the callback. End of this block = Phase 1 complete; Phase 2 (data layer, blocks 4–7) is unblocked.

## Outcomes

### New helpers (`packages/api/src/auth/`)

- ✅ **`oauth-google.ts`** — wraps `arctic`'s `Google` client. `getGoogleClient()` lazy-instantiates with `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `APP_URL`-derived redirect URI. `startAuthorization()` returns `{ url, state, codeVerifier }` ready for the route to stash in cookies. `fetchGoogleUserinfo(accessToken)` hits `https://openidconnect.googleapis.com/v1/userinfo` and returns a typed `{ sub, email, emailVerified, name, picture }` — no JWT decoding, just the OIDC userinfo endpoint. Constants `GOOGLE_OAUTH_PROVIDER = 'google'` and `GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile']` so the values aren't sprinkled across files.
- ✅ **`account-linking.ts`** — `applyOAuthLinkingPolicy(db, identity)` implements [[0016]] verbatim, returning a tagged union: `signed_in_existing` (oauth row already linked), `linked_existing` (verified-email match against existing user → linked), `created_new` (no match → user + workspace + oauth row), or `requires_explicit_link` (email matches an existing user but provider didn't verify the email — refuse to auto-link). Provider-agnostic: a future `auth/oauth-microsoft.ts` plugs in by passing its own `OAuthIdentity` shape.

### Refactored helper

- ✅ **`auth/workspace.ts`** — split into `createWorkspaceForUser(db, ...)` (opens its own transaction; for top-level callers like the password signup route) and `createWorkspaceForUserTx(tx, ...)` (assumes the caller already holds a tx; for composing inside `applyOAuthLinkingPolicy`'s new-user transaction). Reason: drizzle-orm `neon-http` doesn't support nested transactions (it's a single HTTP round-trip), so calling `createWorkspaceForUser(tx, ...)` from inside another `db.transaction(...)` would have failed at runtime. The split keeps both call shapes type-safe and gives a single insert path.

### Routes (replaced stub in `packages/api/src/routes/auth/`)

- ✅ **`oauth-google.ts`**:
  - `GET /authorize` — calls `startAuthorization`, stores `state` and `code_verifier` in HttpOnly cookies (`k_os_oauth_google_state`, `k_os_oauth_google_verifier`), 302-redirects to Google. Cookie max-age 10 minutes — ample for a sign-in round-trip and tight enough to limit replay window. `Secure` gated on `NODE_ENV === 'production'` (same as the session cookie).
  - `GET /callback` — reads `state` + `code` from query, compares against the cookie state, exchanges the code via `validateAuthorizationCode(code, codeVerifier)`, fetches userinfo, runs the linking policy. Cookies are deleted unconditionally before any branching, so a failed exchange doesn't leave them stale. `OAuth2RequestError` from arctic is caught and turned into a `?reason=oauth_exchange` redirect; userinfo failures map to `oauth_userinfo`. Successful sign-in redirects to `${APP_URL}/`; the `requires_explicit_link` branch redirects to `${APP_URL}/auth/error?reason=requires_explicit_link&email=...` so the SPA can surface the right copy.

### Verification

- ✅ `pnpm -r typecheck` — green across all 6 packages + `apps/web`.
- ⏳ Live runtime exercise (browser → /api/auth/oauth/google/authorize → Google → callback → session cookie set → redirect to `/`) deferred. Requires a Google Cloud Console app with the production redirect URI registered. The state cookie + PKCE plumbing is small and exercised by every callback, so end-to-end confidence is high.

## Decisions made

These are below ADR threshold (the architectural calls live in [[0013 - auth-on-oslo-and-arctic-not-lucia]] / [[0014 - auth-methods-password-magic-link-google-oauth]] / [[0016 - account-linking-auto-on-verified-email]]):

- **Userinfo over JWT-decoding**: arctic returns the raw `id_token` JWT alongside the access token. Decoding it would save one HTTP round-trip but require us to verify (or skip-verify) the JWT signature. Hitting Google's `/v1/userinfo` endpoint is one extra request, returns a clean shape, and offloads validity to Google. Round-trip is sub-300ms in practice; the simplicity wins.
- **Three OAuth scopes** (`openid`, `email`, `profile`): everything we need for the linking policy and the user's display name; no calendar / drive scopes that would prompt for sensitive permissions and inflate the consent screen.
- **State cookie name `k_os_oauth_google_state`** (provider-prefixed) so future providers (Microsoft, Apple) can use parallel cookie names without collision and a user can have a Google sign-in cookie set while completing a Microsoft sign-in elsewhere — unlikely, but cheap to support.
- **Both round-trip cookies cleared unconditionally** at the top of the callback handler, before any branching. They're single-use; even if validation later fails, leaving them around helps no one and complicates the threat model.
- **Error-redirect shape** — `${APP_URL}/auth/error?reason=<code>` with optional `&email=...`. Block 11 (auth UI) will translate the codes into copy. Codes used so far: `oauth_state`, `oauth_exchange`, `oauth_userinfo`, `requires_explicit_link`, plus passthrough of Google's `?error=...` codes prefixed `oauth_*`.
- **`requires_explicit_link` is wired but unreachable for Google** — Google always returns `email_verified=true`. Per ADR 0016 the branch is needed for future GitHub-style providers where `email_verified` may be absent. Keeping it in place now means Block-X for new providers is just an `auth/oauth-<provider>.ts` adapter, no policy changes.
- **`account-linking.ts` is provider-agnostic on purpose** — takes a normalized `OAuthIdentity`, not Google-specific shapes. Each provider adapter normalizes its own `email_verified` claim (Google: trust the field; future GitHub: needs an extra `/user/emails` API call to find the verified primary).
- **Display name fallback for new users**: provider's `name` if non-empty, else email local part. Matches the magic-link signup behavior so all three flows produce a consistent first-time experience.
- **Single workspace creation path**: by composing `createWorkspaceForUserTx` inside the user-creation transaction, the new-user branch of OAuth has the same "user + workspace + membership are atomic" guarantee that password signup got in Block 2 — even though the OAuth flow does it in one tx instead of two phases.

## Decisions deferred (not blocking Block 3)

- **`active_workspace_id` cookie / multi-workspace UX**: irrelevant until Phase 6+ when multi-user / family-sharing lands.
- **Per-provider rate limit**: callback hits go through arctic + an external Google call; `/authorize` could be rate-limited but isn't because it doesn't create state on our side beyond a cookie. Revisit if logs show abuse.
- **OAuth account unlink**: ADR 0016 mentions allowing unlink as long as the user retains at least one auth method. No UI for this until Block 16-or-later "account settings" — defer.
- **Sentry / structured error logging on OAuth failures**: the redirect-with-reason gives the user a path forward, but server-side we silently swallow the original error's detail. Add structured logging when the project gets a logger (likely Block 18 launch prep).

## Open questions

- **Will Google reject the redirect URI on first try?** The redirect URI is computed as `${APP_URL}/api/auth/oauth/google/callback`. The exact string must be registered in the Google Cloud Console app (case + trailing-slash sensitive). First time setup almost always needs one console-side fix. The error surfaces as `?error=redirect_uri_mismatch` from Google → our callback redirects to `/auth/error?reason=oauth_redirect_uri_mismatch` (covered by the passthrough handling).
- **Does `db.transaction` over neon-http actually run user + oauth_account + workspace + workspace_member as one atomic statement?** Drizzle's neon-http transaction batches into a single round-trip; if any insert fails the whole batch rolls back. Should be the case for the new-user OAuth path; first end-to-end signup will confirm.

## Next steps

Phase 1 is now done. **Phase 2 — Data layer** opens. The natural next block:

- [ ] **Block 4: Catalog CRUD (contexts, tags) + workspace seeding**. The seeding side ties back to the workspace helper from Blocks 1+3 — `createWorkspaceForUserTx` will gain a follow-on insert that seeds the 6 default contexts in the same transaction that creates the workspace. After Block 4 every signup (password, magic-link, Google) starts the user with a populated catalog.

After that: Block 5 (people/projects/areas), Block 6 (tasks + activity log), Block 7 (inbox + recurring scheduler) — and Phase 1's auth surface stops being touched until UI lands.

## Notes & context

- **Three flows now share one minting tail**: `applyOAuthLinkingPolicy` → `createSession` → `setSessionCookie` is the same closing tail as password login and magic-link verify. The `sessionRequestMeta` helper introduced in Block 2 is now used by all three sign-in entry points, exactly as anticipated.
- **`createWorkspaceForUserTx` is the first transaction-aware helper in the codebase** — model for any future helper that needs to compose with caller transactions. The pattern: name the transaction-inner form `*Tx`, leave the wrapping form as the default.
- **Cookie inventory** after this block: `k_os_session` (auth), `k_os_oauth_google_state` + `k_os_oauth_google_verifier` (round-trip, 10-min). All three are HttpOnly + SameSite=Lax + Path=/ + Secure-in-prod.
- **No ADR amendments**. ADR 0016's edge-case table maps 1:1 to the four `LinkingResult` cases; the implementation is a literal transcription.
