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
 *     from top-level callers like the signup route.
 *   - `createWorkspaceForUserTx(tx, ...)` — assumes the caller already holds
 *     a transaction. Use from inside `db.transaction(...)`. neon-http does
 *     not support nested transactions (it's a single HTTP round-trip), so
 *     the inner form is required when composing with another tx.
 *
 * Block 4 will extend the inner form to seed the 6 default contexts.
 */

import { workspaces, workspaceMembers, type Db } from '@k-os/db';

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

  return workspace;
}

export async function createWorkspaceForUser(
  db: Db,
  input: CreateWorkspaceForUserInput,
): Promise<CreatedWorkspace> {
  return db.transaction((tx) => createWorkspaceForUserTx(tx, input));
}
