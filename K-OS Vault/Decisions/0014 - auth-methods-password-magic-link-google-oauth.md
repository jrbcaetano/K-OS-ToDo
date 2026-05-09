---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - auth
---

# 0014 — Auth methods: password, magic link, Google OAuth

## Context

K-OS needs auth methods that suit:
- A single user starting out (low-friction signin from any device)
- Future family/org members (some will prefer SSO; some will prefer passwords)
- Headless / programmatic future use (long-running tokens for capture-from-anywhere)

The auth spine is built on `oslo` + `arctic` ([[0013 - auth-on-oslo-and-arctic-not-lucia]]) which can support any combination of methods on a single user model.

## Decision

Three methods are supported from day one (backend + schema). UI ships in this order:

1. **Username + password** — Argon2id hashing via `oslo/password`. Ship first, dogfood with the user.
2. **Magic link** — Token issued and emailed via own SMTP ([[0015 - email-own-smtp-via-nodemailer]]). 15-min expiry, single-use, hashed before storage.
3. **Google OAuth** — Via `arctic`. Ship third (requires Google Cloud Console app registration).

Other providers (Apple, Microsoft, GitHub, passkeys) added when needed.

The same `verification_tokens` table backs magic-link, email verification, and future password reset — one mechanism, three uses.

## Alternatives considered

- **Password only** — Simple. **Rejected**: locks out users who'd rather not manage another password; magic-link is genuinely better UX for occasional sign-ins on new devices.
- **OAuth only** — One-click signin. **Rejected**: forces every user to have an OAuth provider account; the user's first dogfood requires the simplest possible login (username + password).
- **Passkeys instead of password** — Most modern; phishing-resistant. **Considered for later**: passwords first because hardware support varies (especially on shared devices); passkeys can layer on later via the same `oauth_accounts`-style join table.
- **Magic link only** — Notion-style. **Rejected**: fragile when SMTP delivery is slow or filtered; passwords as a reliable fallback matter.

## Consequences

- **Positive**: covers all reasonable preferences; same user model serves all three; future methods (passkeys, Apple Sign-In) are additions, not rewrites
- **Negative**: more code than a single-method auth (mitigated — each flow is small; sessions and user model are shared)
- **Neutral**: account-linking policy ([[0016 - account-linking-auto-on-verified-email]]) handles cross-method sign-ins cleanly

## Schema implications

```sql
users.password_hash         TEXT NULL    -- nullable: OAuth-only users don't need one
users.email_verified_at     TIMESTAMPTZ NULL
oauth_accounts(...)         -- one row per (provider, provider_user_id)
verification_tokens(...)    -- magic-link, email-verify, password-reset
```

Full schema in [[Schema design session]] _(pending — next planning round)_.

## References

- [[0013 - auth-on-oslo-and-arctic-not-lucia]]
- [[0015 - email-own-smtp-via-nodemailer]]
- [[0016 - account-linking-auto-on-verified-email]]
- [[0017 - sessions-not-jwts]]
