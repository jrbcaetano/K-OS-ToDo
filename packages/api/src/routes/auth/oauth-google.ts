/**
 * Google OAuth routes: /authorize and /callback.
 *
 * Per [[0014 - auth-methods-password-magic-link-google-oauth]] and
 * [[0016 - account-linking-auto-on-verified-email]]: state-cookie protects
 * the round-trip; PKCE binds the code-exchange to this browser; the linking
 * policy handles auto-link / new-user / explicit-link branching.
 *
 * On success the callback redirects the SPA to `APP_URL/` (or the post-login
 * landing page); on failure it redirects to `APP_URL/auth/error?reason=...`
 * so the UI can render a sensible message.
 */

import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { OAuth2RequestError } from 'arctic';
import { getDb } from '@k-os/db';
import {
  startAuthorization,
  fetchGoogleUserinfo,
  getGoogleClient,
  GOOGLE_OAUTH_PROVIDER,
} from '../../auth/oauth-google';
import { applyOAuthLinkingPolicy } from '../../auth/account-linking';
import { createSession } from '../../auth/sessions';
import { setSessionCookie } from '../../auth/cookies';
import { sessionRequestMeta } from '../../auth/request-meta';

const STATE_COOKIE = 'k_os_oauth_google_state';
const VERIFIER_COOKIE = 'k_os_oauth_google_verifier';
const OAUTH_COOKIE_MAX_AGE_S = 60 * 10; // 10 minutes — round-trip should be quick

const app = new Hono();

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

app.get('/authorize', (c) => {
  const { url, state, codeVerifier } = startAuthorization();

  const cookieOpts = {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: OAUTH_COOKIE_MAX_AGE_S,
  };
  setCookie(c, STATE_COOKIE, state, cookieOpts);
  setCookie(c, VERIFIER_COOKIE, codeVerifier, cookieOpts);

  return c.redirect(url.toString());
});

app.get('/callback', async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const storedState = getCookie(c, STATE_COOKIE);
  const codeVerifier = getCookie(c, VERIFIER_COOKIE);

  // Always clear the round-trip cookies once we've read them — they're
  // single-use, and leaving them around helps no one.
  deleteCookie(c, STATE_COOKIE, { path: '/' });
  deleteCookie(c, VERIFIER_COOKIE, { path: '/' });

  if (oauthError) {
    return c.redirect(`${appUrl()}/auth/error?reason=oauth_${oauthError}`);
  }
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return c.redirect(`${appUrl()}/auth/error?reason=oauth_state`);
  }

  const db = getDb();

  let userinfo;
  try {
    const tokens = await getGoogleClient().validateAuthorizationCode(code, codeVerifier);
    userinfo = await fetchGoogleUserinfo(tokens.accessToken());
  } catch (err) {
    const reason = err instanceof OAuth2RequestError ? 'oauth_exchange' : 'oauth_userinfo';
    return c.redirect(`${appUrl()}/auth/error?reason=${reason}`);
  }

  const linking = await applyOAuthLinkingPolicy(db, {
    provider: GOOGLE_OAUTH_PROVIDER,
    providerUserId: userinfo.sub,
    email: userinfo.email,
    emailVerified: userinfo.emailVerified,
    displayName: userinfo.name,
  });

  if (linking.kind === 'requires_explicit_link') {
    // Per ADR 0016: an unverified-email match against an existing user is
    // refused; the SPA should ask the user to log in via password first
    // and then link from settings. Google always verifies, so this branch
    // is effectively unreachable for Google but is here for future
    // providers and for robustness.
    return c.redirect(
      `${appUrl()}/auth/error?reason=requires_explicit_link&email=${encodeURIComponent(linking.email)}`,
    );
  }

  const meta = sessionRequestMeta(c);
  const { token } = await createSession(db, { userId: linking.userId, ...meta });
  setSessionCookie(c, token);

  return c.redirect(`${appUrl()}/`);
});

export default app;
