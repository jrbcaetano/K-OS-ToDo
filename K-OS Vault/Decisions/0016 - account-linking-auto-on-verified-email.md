---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - auth
  - oauth
---

# 0016 — Account linking: auto-link on verified email

## Context

A user has a password account with email `joe@example.com`. They later sign in with Google, and Google returns the same email. Three policies are possible:

| Policy | Behavior |
|---|---|
| **A. Auto-link** | OAuth account joins the existing user automatically |
| **B. Require explicit link** | Force them to log in with the password first, then link |
| **C. Keep separate** | Create a new user, two accounts with same email |

Each policy has security and UX trade-offs. The decision affects every cross-method sign-in.

## Decision

**Policy A — Auto-link, but only when the OAuth provider verifies the email.**

For Google: emails are always verified (Google requires email ownership before letting you set the address). Auto-link is safe.

For other providers (when added):
- **Microsoft / Apple**: email verification is reliable → auto-link.
- **GitHub**: emails on the profile are verified, but the primary email returned via OAuth may not be. Check the `email_verified` claim; if absent or false, fall back to **Policy B** (require explicit link via existing password login).
- **Custom OAuth** (future): default to Policy B unless we explicitly verify the provider's claim.

Implementation: when an OAuth callback returns an email matching an existing user:

```
if (provider returns email AND email_verified) {
  link this OAuth account to the existing user;
  log in.
} else {
  prompt user to sign in to existing account first, then link.
}
```

A user with no password (OAuth-only) can later add a password via account settings.

## Alternatives considered

- **Policy B — Require explicit link** — Safer (no risk of provider lying about email). **Rejected as default** because: with verified-email providers (Google, Microsoft, Apple) the risk is negligible; the friction is annoying — "you signed up with password, now click here to link Google" is a bad first-time-with-Google experience.
- **Policy C — Keep separate** — Simplest server logic. **Rejected**: confusing UX (which account am I logged into?); duplicate data; account-merge migrations down the line.

## Consequences

- **Positive**: smooth UX — Google sign-in just works for existing users; same identity in both flows
- **Negative**: relies on the provider's email-verification claim being honest. For Google/Microsoft/Apple this is reliable; for less-trusted providers we need the conditional fallback
- **Neutral**: a passwordless OAuth-only user can later set a password — enabled by `users.password_hash` being nullable

## Edge cases handled

| Case | Behavior |
|---|---|
| OAuth returns email matching existing user, email verified | Auto-link |
| OAuth returns email matching existing user, email NOT verified | Require login to existing account, then link |
| OAuth returns email NOT matching any user | Create new user with email + this OAuth account |
| User wants to unlink OAuth from their account | Allowed, as long as the user retains at least one auth method (password or another OAuth) |
| Two OAuth providers, same email, different users | Will not occur — each new OAuth either links to an existing user or creates a new one |

## References

- [[0013 - auth-on-oslo-and-arctic-not-lucia]]
- [[0014 - auth-methods-password-magic-link-google-oauth]]
