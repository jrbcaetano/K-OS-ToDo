/**
 * Magic-link auth routes: request, verify.
 *
 * Per [[0014 - auth-methods-password-magic-link-google-oauth]]: the link
 * doubles as a sign-up — verifying for an unknown email creates the user
 * (no password) and a workspace before minting the session. The token in
 * `verification_tokens` is single-use and 15-minute-lived per [[0014]].
 *
 * `/request` always returns 200 with the same shape regardless of whether
 * the email matches an existing user — that prevents the response from
 * acting as an email-enumeration oracle.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, users, type Db } from '@k-os/db';
import {
  issueToken,
  consumeToken,
  MAGIC_LINK_LIFETIME_MS,
} from '../../auth/verification-tokens';
import { createWorkspaceForUser } from '../../auth/workspace';
import { createSession } from '../../auth/sessions';
import { setSessionCookie } from '../../auth/cookies';
import { sessionRequestMeta } from '../../auth/request-meta';
import { rateLimit } from '../../auth/rate-limit';
import { sendMail } from '../../email/transporter';
import { magicLinkEmail } from '../../email/templates/magic-link';

const app = new Hono();

const requestSchema = z.object({
  email: z.string().email().max(254),
});

app.post('/request', rateLimit('magicLink'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body' }, 400);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const expiresAt = new Date(Date.now() + MAGIC_LINK_LIFETIME_MS);
  const { token } = await issueToken(db, {
    purpose: 'magic_link',
    expiresAt,
    userId: existing?.id ?? null,
    email: existing ? null : email,
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  const { subject, text, html } = magicLinkEmail({
    appUrl,
    rawToken: token,
    expiresInMinutes: Math.floor(MAGIC_LINK_LIFETIME_MS / 60_000),
  });
  await sendMail({ to: email, subject, text, html });

  return c.json({ ok: true });
});

const verifySchema = z.object({
  token: z.string().min(32).max(128),
});

app.post('/verify', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body' }, 400);
  }

  const db = getDb();
  const result = await consumeToken(db, parsed.data.token, 'magic_link');

  switch (result.kind) {
    case 'unknown':
    case 'wrong_purpose':
      return c.json({ error: 'invalid_token' }, 400);
    case 'expired':
      return c.json({ error: 'expired' }, 410);
    case 'already_used':
      return c.json({ error: 'already_used' }, 410);
    case 'consumed':
      break;
  }

  const user = await resolveOrCreateUser(db, result.userId, result.email);

  const meta = sessionRequestMeta(c);
  const { token: sessionToken } = await createSession(db, { userId: user.id, ...meta });
  setSessionCookie(c, sessionToken);

  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

interface ResolvedUser {
  id: string;
  email: string;
  displayName: string;
}

async function resolveOrCreateUser(
  db: Db,
  userId: string | null,
  email: string | null,
): Promise<ResolvedUser> {
  // Branch A: token was issued for an existing user — log them in.
  if (userId) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error('magic_link.user_missing');

    // Magic-link click is proof of email ownership; mark verified if not already.
    if (!user.emailVerifiedAt) {
      await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id));
    }
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  // Branch B: token was issued against an email with no user yet.
  if (!email) throw new Error('magic_link.token_has_no_subject');

  // Race with another simultaneous magic-link signup for the same email —
  // re-check after consume in case another flow created the user first.
  const [raced] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (raced) return raced;

  // Create the user. displayName defaults to the email local-part —
  // user can rename in profile later.
  const localPart = email.split('@')[0] ?? email;
  const [created] = await db
    .insert(users)
    .values({
      email,
      displayName: localPart,
      emailVerifiedAt: new Date(),
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    });

  await createWorkspaceForUser(db, { userId: created.id });
  return created;
}

export default app;
