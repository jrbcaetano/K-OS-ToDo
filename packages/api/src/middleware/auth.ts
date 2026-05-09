/**
 * Auth middleware: read the session cookie, validate it, and load the user
 * plus their active workspace onto the Hono context.
 *
 * Apply at app level before any route that requires auth. Routes mounted
 * under `/auth/*` and `/health` stay outside this middleware — see
 * `packages/api/src/index.ts`.
 *
 * Failure modes all return 401 with a generic body — we never leak whether
 * the cookie was missing, malformed, expired, or revoked.
 *
 * The workspace-loading half is here (rather than in middleware/workspace.ts)
 * so a single round-trip resolves user + membership; the workspace middleware
 * just exposes typed accessors. See [[0003 - workspace-scoped-schema-for-multi-user-readiness]].
 */

import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { users, workspaceMembers, workspaces, getDb, type Db } from '@k-os/db';
import { validateSession } from '../auth/sessions';
import { SESSION_COOKIE_NAME } from '../auth/cookies';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  role: 'owner' | 'member' | 'viewer';
}

/**
 * Variables this middleware contributes to the Hono context. Routes mounted
 * under `requireAuth` can read `c.get('user')`, `c.get('session')`, and
 * `c.get('workspace')` with full typing when their Hono instance is declared
 * as `new Hono<{ Variables: AuthVariables }>()`.
 */
export type AuthVariables = {
  user: AuthUser;
  session: AuthSession;
  workspace: AuthWorkspace;
};

async function loadActiveWorkspace(
  db: Db,
  userId: string,
): Promise<AuthWorkspace | null> {
  // Single-user MVP: a user has exactly one workspace. When multi-user lands,
  // an `active_workspace_id` cookie or header will pick among memberships;
  // for now the first row is unambiguous.
  const [row] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return row ?? null;
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const rawToken = getCookie(c, SESSION_COOKIE_NAME);
    if (!rawToken) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    const db = getDb();
    const result = await validateSession(db, rawToken);
    if (result.kind !== 'valid') {
      return c.json({ error: 'unauthorized' }, 401);
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, result.session.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    const workspace = await loadActiveWorkspace(db, user.id);
    if (!workspace) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    c.set('user', user);
    c.set('session', {
      tokenHash: result.session.tokenHash,
      expiresAt: result.session.expiresAt,
    });
    c.set('workspace', workspace);

    await next();
  },
);
