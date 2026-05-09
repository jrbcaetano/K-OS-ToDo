/**
 * Session cookie helpers.
 *
 * Per [[0017 - sessions-not-jwts]] § "Cookie security":
 *   - HttpOnly: JS can't read it (XSS protection)
 *   - Secure: HTTPS only (skipped in dev so localhost works)
 *   - SameSite=Lax: CSRF protection on state-changing requests
 *   - Path=/: cookie applies to the entire app
 *
 * We use Hono's cookie helpers so the same code runs on Vercel Node and any
 * other Hono-compatible runtime.
 */

import type { Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { SESSION_IDLE_LIFETIME_MS } from './sessions';

export const SESSION_COOKIE_NAME = 'k_os_session';

/**
 * Whether to mark the cookie as `Secure`. In production we always want it;
 * in local development over HTTP we don't, otherwise the browser drops it.
 */
function isSecureContext(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Persist the raw session token in the response cookie.
 * The token itself is opaque; the server hashes it on read.
 */
export function setSessionCookie(c: Context, rawToken: string): void {
  setCookie(c, SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_IDLE_LIFETIME_MS / 1000),
  });
}

/** Remove the session cookie from the client (used on logout). */
export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    secure: isSecureContext(),
    sameSite: 'Lax',
  });
}
