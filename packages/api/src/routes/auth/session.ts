/**
 * Session introspection + termination.
 *
 *   GET    /        — "who am I?" Returns user + active workspace, or 401.
 *                     The web client polls this on app boot to decide
 *                     whether to render the app shell or redirect to /login.
 *   DELETE /        — log out the current session (revoke + clear cookie).
 *   DELETE /all     — log out every active session for the current user
 *                     (used by "log out everywhere" and after password change).
 *
 * Note: requireAuth is intentionally NOT mounted on /auth/* because that
 * middleware loads a workspace, and unauthenticated /auth/session probes
 * must answer 401 cleanly without throwing. We validate the cookie inline.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { users, workspaces, workspaceMembers, getDb } from '@k-os/db';
import {
  validateSession,
  revokeSession,
  revokeAllForUser,
} from '../../auth/sessions';
import { SESSION_COOKIE_NAME, clearSessionCookie } from '../../auth/cookies';

const app = new Hono();

app.get('/', async (c) => {
  const rawToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!rawToken) return c.json({ error: 'unauthorized' }, 401);

  const db = getDb();
  const result = await validateSession(db, rawToken);
  if (result.kind !== 'valid') {
    // Clear a stale cookie so the client stops sending it.
    clearSessionCookie(c);
    return c.json({ error: 'unauthorized' }, 401);
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      approvalStatus: users.approvalStatus,
      platformRole: users.platformRole,
    })
    .from(users)
    .where(eq(users.id, result.session.userId))
    .limit(1);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  // A pending/rejected user shouldn't keep a usable session even if one
  // was minted before the status changed. Treat it as logged-out.
  if (user.approvalStatus !== 'approved') {
    clearSessionCookie(c);
    return c.json({ error: 'unauthorized' }, 401);
  }

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      platformRole: user.platformRole,
    },
    workspace: workspace ?? null,
  });
});

app.delete('/', async (c) => {
  const rawToken = getCookie(c, SESSION_COOKIE_NAME);
  if (rawToken) {
    const db = getDb();
    await revokeSession(db, rawToken);
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.delete('/all', async (c) => {
  const rawToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!rawToken) return c.json({ error: 'unauthorized' }, 401);

  const db = getDb();
  const result = await validateSession(db, rawToken);
  if (result.kind !== 'valid') return c.json({ error: 'unauthorized' }, 401);

  await revokeAllForUser(db, result.session.userId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

export default app;
