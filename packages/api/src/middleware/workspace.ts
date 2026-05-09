/**
 * Workspace accessors.
 *
 * The auth middleware (`requireAuth`) already loads the active workspace
 * onto the Hono context. This module exposes typed accessors so route
 * handlers can pull just `workspace_id` (the most common downstream need)
 * without re-typing the Variables shape every time.
 *
 * Per [[0003 - workspace-scoped-schema-for-multi-user-readiness]] every
 * domain query MUST scope by the active workspace id; this is the canonical
 * source for it.
 */

import type { Context } from 'hono';
import type { AuthVariables, AuthWorkspace } from './auth';

/** Read the active workspace from a Hono context. Throws if `requireAuth` hasn't run. */
export function getWorkspace(c: Context<{ Variables: AuthVariables }>): AuthWorkspace {
  const ws = c.get('workspace');
  if (!ws) {
    throw new Error('getWorkspace called before requireAuth ran');
  }
  return ws;
}

/** Shorthand for the most common need: `where(eq(table.workspaceId, getWorkspaceId(c)))`. */
export function getWorkspaceId(c: Context<{ Variables: AuthVariables }>): string {
  return getWorkspace(c).id;
}
