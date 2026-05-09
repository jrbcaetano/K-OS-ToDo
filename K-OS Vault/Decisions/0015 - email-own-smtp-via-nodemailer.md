---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - auth
  - email
  - smtp
---

# 0015 — Email: own SMTP server via `nodemailer`

## Context

The magic-link flow in [[0014 - auth-methods-password-magic-link-google-oauth]] requires sending email. Future flows will too (email verification, password reset, optional digest emails).

The user has stated: "I have an SMTP server and own domain. I can configure an email for the app." This is a relevant constraint — the cheapest, most-portable option is to use what already exists.

## Decision

- **Library**: `nodemailer` (Node SMTP client)
- **Transport**: User's own SMTP server, authenticated with credentials in Vercel env vars
- **From address**: Dedicated mailbox on user's domain (e.g. `noreply@<user-domain>`)
- **Templates**: Plain-text first, HTML second, both stored in `packages/api/email-templates/` as small functions returning `{ subject, text, html }`
- **Required setup on the sending domain**: SPF, DKIM, and DMARC records — without these, deliverability tanks regardless of SMTP server reputation

Auth API routes that send email run on **Vercel Node serverless** (not Edge — `nodemailer` needs Node primitives). This was already the runtime choice in [[0009 - api-hono-on-vercel-serverless]].

## Alternatives considered

- **Resend** — Best DX of the modern email APIs; 100/day free, $20/mo for 3000. **Rejected** because: user already has SMTP; adding a third-party dependency for something we have in-house is needless lock-in.
- **Postmark** — Excellent deliverability; transactional-only. **Rejected**: same reason as Resend.
- **AWS SES** — Cheapest at scale ($0.10 per 1000). **Rejected**: complex setup; deliverability requires reputation warmup; Vercel-AWS routing adds ops surface.
- **Cloudflare Email Routing** — Free, but **receive-only** — cannot send. Useful as an alias to forward `noreply@<domain>` if the user's SMTP can't host it, but doesn't replace SMTP for sending.
- **Self-host with Postfix on a VPS** — User already has SMTP; if not, this would be the no-vendor option, with the deliverability burden and ops cost.

## Consequences

- **Positive**: zero third-party dependency for auth; user owns the deliverability story (can move providers without changing code by changing env vars); free at any scale relevant to K-OS
- **Negative**: deliverability is on the user's existing SMTP reputation — if it's a personal Postfix on a residential IP, magic-link emails will land in spam. SPF/DKIM/DMARC are non-negotiable.
- **Neutral**: nodemailer is mature and stable; no maintenance concerns

## Operational checklist (for the user, before magic-link launches)

- [ ] Dedicated mailbox on the sending domain (e.g. `noreply@example.com`)
- [ ] SMTP credentials added to Vercel env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- [ ] SPF record on sending domain
- [ ] DKIM signing configured on the SMTP server, public key in DNS
- [ ] DMARC record (start with `p=none` for monitoring; tighten later)
- [ ] Test send to a Gmail / Outlook / Yahoo address — confirm inbox delivery, not spam

## References

- [[0013 - auth-on-oslo-and-arctic-not-lucia]]
- [[0014 - auth-methods-password-magic-link-google-oauth]]
- [[0009 - api-hono-on-vercel-serverless]]
- [nodemailer](https://nodemailer.com/)
