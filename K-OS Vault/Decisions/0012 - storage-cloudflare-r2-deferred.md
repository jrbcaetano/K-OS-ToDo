---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - storage
  - hosting
  - deferred
---

# 0012 — Storage: Cloudflare R2 (deferred)

## Context

K-OS will eventually need file storage for:
- Voice-capture audio (mobile quick capture)
- Image attachments on tasks
- Document references
- Profile photos (less likely — Avatar is initials + colour, see design)

**Not needed at MVP.** Quick capture is text-only first; image/voice attachments come later.

## Decision

When file storage becomes needed, use **Cloudflare R2** (S3-compatible).

- Free tier: **10 GB storage**, **free egress** (R2's signature feature — S3 charges for egress)
- Use the **AWS S3 SDK** (R2 is wire-compatible) so the storage layer is portable to S3, Backblaze B2, or any other S3-compatible host with a config change
- File metadata (URL, MIME type, size, owner) lives in Postgres; the file bytes live in R2

**Defer setup** until the first feature lands that needs uploads. The schema will reserve `attachments` table fields when designed but no R2 bucket gets created until a feature pulls it in.

## Alternatives considered

- **AWS S3** — Industry standard. **Rejected**: egress costs (~$0.09/GB) become significant if K-OS gains modest popularity or syncs across devices.
- **Backblaze B2** — Cheap. **Rejected for now**: R2's free 10 GB + free egress is more generous; we can switch to B2 later by changing the endpoint.
- **Supabase Storage** — Rejected with Supabase ([[0008 - database-neon-postgres]]).
- **Vercel Blob** — Convenient but locked to Vercel's pricing model.
- **Self-hosted MinIO** — S3-compatible, self-hostable. **Rejected**: ops burden for a personal app.
- **Bytea columns in Postgres** — Storing files inline in the DB. **Rejected**: bloats backups, hurts query performance, hits Neon's storage cap quickly.

## Consequences

- **Positive**: free at personal scale; free egress (so cross-device sync of attachments doesn't blow up the bill); S3-compatible API means easy migration if needed; defers all complexity
- **Negative**: when we do enable it, requires a Cloudflare account (separate from Vercel) — small ops surface to manage
- **Neutral**: R2 has good Workers integration if we ever migrate the API there

## References

- [[0008 - database-neon-postgres]]
- [[0011 - hosting-vercel-plus-neon-free-tier]]
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
