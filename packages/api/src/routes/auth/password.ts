/**
 * Password auth routes: signup, login, logout.
 *
 * Per [[0014 - auth-methods-password-magic-link-google-oauth]]: Argon2id
 * via `oslo/password`. Sessions and the workspace creation helper come from
 * Block 1 (auth/sessions.ts, auth/workspace.ts) — these routes compose them.
 *
 * Per-IP rate limiting on signup and login (in-memory token bucket).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { getCookie } from 'hono/cookie';
import { getDb } from '@k-os/db';
import {
  signup,
  verifyPassword,
  EmailAlreadyInUseError,
  PasswordTooShortError,
  MIN_PASSWORD_LENGTH,
} from '../../auth/password';
import { createWorkspaceForUserTx, ensureWorkspaceForUser } from '../../auth/workspace';
import { createSession, revokeSession } from '../../auth/sessions';
import {
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from '../../auth/cookies';
import { sessionRequestMeta } from '../../auth/request-meta';
import { rateLimit } from '../../auth/rate-limit';

const app = new Hono();

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
  displayName: z.string().min(1).max(80),
});

app.post('/signup', rateLimit('signup'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const db = getDb();
  const meta = sessionRequestMeta(c);
  try {
    // Atomic: user + workspace (+member +contexts) + session all commit
    // together, or none of them do. Prevents the "user without workspace"
    // orphan state that would otherwise 401 every protected route.
    const result = await db.transaction(async (tx) => {
      const user = await signup(tx, parsed.data);
      await createWorkspaceForUserTx(tx, { userId: user.id });
      const { token } = await createSession(tx, { userId: user.id, ...meta });
      return { user, token };
    });
    setSessionCookie(c, result.token);

    return c.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof EmailAlreadyInUseError) {
      return c.json({ error: 'email_in_use' }, 409);
    }
    if (err instanceof PasswordTooShortError) {
      return c.json({ error: 'password_too_short' }, 400);
    }
    throw err;
  }
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

app.post('/login', rateLimit('login'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body' }, 400);
  }

  const db = getDb();
  const user = await verifyPassword(db, parsed.data.email, parsed.data.password);
  if (!user) {
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  // Self-heal: if a previous signup wrote the user row but failed before the
  // workspace tx (e.g. the old neon-http transaction error), the user has no
  // workspace and every protected route 401s. Make sure they have one now.
  await ensureWorkspaceForUser(db, user.id);

  const meta = sessionRequestMeta(c);
  const { token } = await createSession(db, { userId: user.id, ...meta });
  setSessionCookie(c, token);

  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

app.post('/logout', async (c) => {
  const rawToken = getCookie(c, SESSION_COOKIE_NAME);
  if (rawToken) {
    const db = getDb();
    await revokeSession(db, rawToken);
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

export default app;
