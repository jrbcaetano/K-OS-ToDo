/**
 * Tiny helper to derive `user_agent` + `ip_hash` for a new session.
 *
 * Used by every flow that mints a session: password login, magic-link verify,
 * and (Block 3) OAuth callback. Keeping the extraction in one place means
 * "what counts as a client IP / how is it hashed" has a single answer.
 */

import { createHash } from 'node:crypto';
import type { Context } from 'hono';

export interface SessionRequestMeta {
  userAgent: string | null;
  ipHash: string | null;
}

function clientIp(c: Context): string | null {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? null;
  return c.req.header('x-real-ip')?.trim() ?? null;
}

export function sessionRequestMeta(c: Context): SessionRequestMeta {
  const userAgent = c.req.header('user-agent') ?? null;
  const ip = clientIp(c);
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;
  return { userAgent, ipHash };
}
