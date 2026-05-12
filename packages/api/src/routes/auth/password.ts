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
    // Pending users get a row only — no workspace and no session. They'll
    // come back through `/login` once a platform admin approves them, and
    // their workspace is provisioned lazily then (see /login below).
    //
    // Approved-on-signup (the platform-admin email) goes through the full
    // user + workspace + session transaction so the first deploy can boot
    // straight into the admin queue.
    const result = await db.transaction(async (tx) => {
      const user = await signup(tx, parsed.data);
      if (user.approvalStatus === 'approved') {
        await createWorkspaceForUserTx(tx, { userId: user.id });
        const { token } = await createSession(tx, { userId: user.id, ...meta });
        return { user, token };
      }
      return { user, token: null };
    });
    if (result.token) setSessionCookie(c, result.token);

    return c.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName,
          approvalStatus: result.user.approvalStatus,
          platformRole: result.user.platformRole,
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

  // Block login for accounts that aren't approved yet. We separate the two
  // signals so the frontend can render different copy: pending users see a
  // "waiting for admin approval" hint, rejected users see a generic denial.
  if (user.approvalStatus === 'pending') {
    return c.json({ error: 'account_pending_approval' }, 403);
  }
  if (user.approvalStatus === 'rejected') {
    // Don't leak that the address ever existed — treat like wrong password.
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  // Self-heal: if a previous signup wrote the user row but failed before the
  // workspace tx, or if the user was approved after signup, provision the
  // workspace lazily now.
  await ensureWorkspaceForUser(db, user.id);

  const meta = sessionRequestMeta(c);
  const { token } = await createSession(db, { userId: user.id, ...meta });
  setSessionCookie(c, token);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      platformRole: user.platformRole,
    },
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
