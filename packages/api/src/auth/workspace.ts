/**
 * Workspace creation helper.
 *
 * Per [[0003 - workspace-scoped-schema-for-multi-user-readiness]]: every new
 * user gets one workspace at signup, with the user seated as the sole owner.
 * The auth flows (Block 2 password / magic link, Block 3 Google OAuth) all
 * call this helper so workspace creation has a single shape and a single
 * place to evolve.
 *
 * Block 4 will extend this helper to seed the 6 default contexts inside the
 * same transaction.
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
 * Create a workspace and seat `userId` as its sole owner. Returns the new
 * workspace's id + name. Both rows are inserted in a transaction so we never
 * end up with an orphaned workspace if the membership write fails.
 */
export async function createWorkspaceForUser(
  db: Db,
  { userId, name = 'Personal' }: CreateWorkspaceForUserInput,
): Promise<CreatedWorkspace> {
  return db.transaction(async (tx) => {
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
  });
}
