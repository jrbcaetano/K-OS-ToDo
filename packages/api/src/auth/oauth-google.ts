/**
 * Google OAuth client and userinfo fetch.
 *
 * Per [[0013 - auth-on-oslo-and-arctic-not-lucia]] and
 * [[0014 - auth-methods-password-magic-link-google-oauth]]: arctic provides
 * the Google client; we own the rest.
 *
 * Flow:
 *   1. /authorize generates a `state` and a PKCE `code_verifier`, stores
 *      both in HttpOnly cookies, and redirects the browser to Google.
 *   2. /callback validates state, exchanges the code (with the verifier)
 *      for tokens via `validateAuthorizationCode`, then calls Google's
 *      userinfo endpoint to read `sub`, `email`, `email_verified`, etc.
 *   3. The account-linking module (auth/account-linking.ts) decides
 *      whether to sign in an existing user or create a new one.
 */

import { Google, generateState, generateCodeVerifier } from 'arctic';

const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_OAUTH_PROVIDER = 'google';
export const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'];

interface GoogleEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function readGoogleEnv(): GoogleEnv {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error(
      'Google OAuth env not set: require GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL',
    );
  }
  // Must match the redirect URI registered in the Google Cloud Console app.
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/oauth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

let cached: Google | null = null;

export function getGoogleClient(): Google {
  if (cached) return cached;
  const env = readGoogleEnv();
  cached = new Google(env.clientId, env.clientSecret, env.redirectUri);
  return cached;
}

export interface GoogleAuthorizationStart {
  url: URL;
  state: string;
  codeVerifier: string;
}

/** Build the Google authorization URL plus the state and verifier the
 *  callback will need to validate the round-trip. */
export function startAuthorization(): GoogleAuthorizationStart {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = getGoogleClient().createAuthorizationURL(state, codeVerifier, GOOGLE_OAUTH_SCOPES);
  return { url, state, codeVerifier };
}

export interface GoogleUserinfo {
  /** Google's stable user id. Use as `oauth_accounts.provider_user_id`. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * Hit Google's OIDC userinfo endpoint with an access token. Throws on
 * non-200 — the caller treats that as an OAuth failure and redirects with
 * an error.
 */
export async function fetchGoogleUserinfo(accessToken: string): Promise<GoogleUserinfo> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`google_userinfo_failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    sub?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
    picture?: unknown;
  };

  if (typeof data.sub !== 'string' || typeof data.email !== 'string') {
    throw new Error('google_userinfo_malformed');
  }

  return {
    sub: data.sub,
    email: data.email,
    // OIDC spec: email_verified MAY be a boolean or omitted. Default to
    // false if absent. Google's implementation always sets it.
    emailVerified: data.email_verified === true,
    name: typeof data.name === 'string' ? data.name : null,
    picture: typeof data.picture === 'string' ? data.picture : null,
  };
}
