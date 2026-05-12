/**
 * Workspace creation helper.
 *
 * Per [[0003 - workspace-scoped-schema-for-multi-user-readiness]]: every new
 * user gets one workspace at signup, with the user seated as the sole owner.
 * The auth flows (Block 2 password / magic link, Block 3 Google OAuth) all
 * call this helper so workspace creation has a single shape and a single
 * place to evolve.
 *
 * Two callable forms:
 *   - `createWorkspaceForUser(db, ...)` — opens its own transaction. Use
 *     from top-level callers like the signup route. The DB client uses the
 *     neon-serverless (WebSocket) driver so real transactions work.
 *   - `createWorkspaceForUserTx(tx, ...)` — assumes the caller already holds
 *     a transaction. Use when composing with another tx; pass `tx` to keep
 *     the work atomic.
 *
 * Block 4 will extend the inner form to seed the 6 default contexts.
 */

import { eq } from 'drizzle-orm';
import { workspaces, workspaceMembers, contexts, type Db } from '@k-os/db';
import { DEFAULT_CONTEXTS } from '@k-os/core';

export interface CreateWorkspaceForUserInput {
  userId: string;
  /** Defaults to "Personal" — single-user UI never exposes workspace names anyway. */
  name?: string;
}

export interface CreatedWorkspace {
  id: string;
  name: string;
}

/**
 * Transaction handle compatible with both the top-level Db client and the
 * `tx` argument of `db.transaction(...)`. Both implement the query API
 * methods we use (`insert`, `select`, etc.).
 */
type TxLike = Parameters<Parameters<Db['transaction']>[0]>[0] | Db;

export async function createWorkspaceForUserTx(
  tx: TxLike,
  { userId, name = 'Personal' }: CreateWorkspaceForUserInput,
): Promise<CreatedWorkspace> {
  const [workspace] = await tx
    .insert(workspaces)
    .values({ name, createdBy: userId })
    .returning({ id: workspaces.id, name: workspaces.name });

  await tx.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: 'owner',
  });

  // Seed the default contexts so the user lands with a populated catalog —
  // matches the design's `--ctx-*` palette. Users can rename / recolour /
  // reorder / add / remove via the contexts routes.
  await tx.insert(contexts).values(
    DEFAULT_CONTEXTS.map((c) => ({
      workspaceId: workspace.id,
      slug: c.slug,
      label: c.label,
      color: c.color,
      sortOrder: c.sortOrder,
    })),
  );

  return workspace;
}

export async function createWorkspaceForUser(
  db: Db,
  input: CreateWorkspaceForUserInput,
): Promise<CreatedWorkspace> {
  return db.transaction((tx) => createWorkspaceForUserTx(tx, input));
}

/**
 * Make sure `userId` has at least one workspace. If they already do, return
 * the existing one untouched. If not (e.g. an earlier signup committed the
 * user row but failed before the workspace tx ran), create the default
 * workspace + member + contexts now.
 *
 * Safe to call on every login as a self-heal step.
 */
export async function ensureWorkspaceForUser(
  db: Db,
  userId: string,
): Promise<CreatedWorkspace> {
  const [existing] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);
  if (existing) return existing;

  return createWorkspaceForUser(db, { userId });
}
