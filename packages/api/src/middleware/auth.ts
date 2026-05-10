/**
 * Auth middleware: accept either a session cookie (user actor) or an
 * `Authorization: Bearer kos_…` agent key (agent actor) and load the
 * caller + active workspace onto the Hono context.
 *
 * Per [[0020 - agent-native-architecture-agents-external-to-platform]]:
 * the platform's API is the contract for both humans and agents. Routes
 * don't branch on which kind of actor is calling — they read `c.get('actor')`
 * for audit-stamping and `c.get('workspace')` for scoping. Domain logic
 * stays uniform.
 *
 * Failure modes all return 401 with a generic body — we never leak whether
 * the cookie was missing, malformed, expired, or the bearer token unknown.
 */

import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { users, workspaceMembers, workspaces, getDb, type Db } from '@k-os/db';
import { validateSession } from '../auth/sessions';
import { SESSION_COOKIE_NAME } from '../auth/cookies';
import { validateAgentKey } from '../auth/agent-keys';

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

export interface AuthAgent {
  id: string;
  label: string;
}

/**
 * Discriminated actor — domain code uses this when stamping events so
 * `task_events.actor_kind` accurately reflects who did the work.
 *
 *   - `user`: a human; `userId` populated; emit events with actor_kind='user'.
 *   - `agent`: an external service authenticated by Agent API key; emit with
 *     actor_kind='agent' and actor_user_id=null.
 */
export type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'agent'; agentId: string; label: string; issuedByUserId: string };

/**
 * Variables this middleware contributes to the Hono context.
 *
 * - `actor` is always set (the auth check guarantees it).
 * - `user` / `session` are only populated for cookie auth.
 * - `agent` is only populated for bearer auth.
 * - `workspace` is always set.
 */
export type AuthVariables = {
  actor: Actor;
  user?: AuthUser;
  session?: AuthSession;
  agent?: AuthAgent;
  workspace: AuthWorkspace;
};

async function loadUserActiveWorkspace(
  db: Db,
  userId: string,
): Promise<AuthWorkspace | null> {
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

async function loadWorkspaceById(db: Db, workspaceId: string): Promise<AuthWorkspace | null> {
  const [row] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!row) return null;
  // Agents act as workspace operators; assigning role 'member' is the
  // reasonable default for now. Per-agent scopes ladder onto this in a
  // future ADR (see ADR 0020 Phase 2 notes).
  return { id: row.id, name: row.name, role: 'member' };
}

const BEARER_RE = /^Bearer\s+(.+)$/i;

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const db = getDb();

    // Bearer (agent) takes precedence — explicit credentials beat ambient cookies.
    const authHeader = c.req.header('authorization');
    const bearerMatch = authHeader ? BEARER_RE.exec(authHeader) : null;
    if (bearerMatch) {
      const rawKey = bearerMatch[1]!.trim();
      const validated = await validateAgentKey(db, rawKey);
      if (!validated) return c.json({ error: 'unauthorized' }, 401);

      const workspace = await loadWorkspaceById(db, validated.workspaceId);
      if (!workspace) return c.json({ error: 'unauthorized' }, 401);

      c.set('actor', {
        kind: 'agent',
        agentId: validated.keyId,
        label: validated.label,
        issuedByUserId: validated.issuedByUserId,
      });
      c.set('agent', { id: validated.keyId, label: validated.label });
      c.set('workspace', workspace);
      await next();
      return;
    }

    // Cookie (user) path.
    const rawToken = getCookie(c, SESSION_COOKIE_NAME);
    if (!rawToken) return c.json({ error: 'unauthorized' }, 401);

    const result = await validateSession(db, rawToken);
    if (result.kind !== 'valid') return c.json({ error: 'unauthorized' }, 401);

    const [user] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, result.session.userId))
      .limit(1);
    if (!user) return c.json({ error: 'unauthorized' }, 401);

    const workspace = await loadUserActiveWorkspace(db, user.id);
    if (!workspace) return c.json({ error: 'unauthorized' }, 401);

    c.set('actor', { kind: 'user', userId: user.id });
    c.set('user', user);
    c.set('session', {
      tokenHash: result.session.tokenHash,
      expiresAt: result.session.expiresAt,
    });
    c.set('workspace', workspace);
    await next();
  },
);

/**
 * Helper: derive the (actor_kind, actor_user_id) pair for `task_events`
 * inserts from the current Actor. Centralised so domain routes don't
 * sprinkle the conditional everywhere.
 */
export function actorEventStamp(actor: Actor): {
  actorKind: 'user' | 'agent';
  actorUserId: string | null;
} {
  if (actor.kind === 'agent') return { actorKind: 'agent', actorUserId: null };
  return { actorKind: 'user', actorUserId: actor.userId };
}

/**
 * Resolve a "human on record" user id for FKs like `created_by` /
 * `owner_id`. Users speak for themselves; agents borrow the user who
 * issued their key. Both branches always resolve to a valid `users(id)`.
 */
export function actorUserId(actor: Actor): string {
  return actor.kind === 'agent' ? actor.issuedByUserId : actor.userId;
}
