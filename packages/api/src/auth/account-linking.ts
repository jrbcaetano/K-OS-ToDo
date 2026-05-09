/**
 * OAuth account-linking policy.
 *
 * Per [[0016 - account-linking-auto-on-verified-email]]:
 *   1. If this (provider, provider_user_id) is already linked, sign in
 *      that user — same identity, no changes.
 *   2. If the provider returned an email matching an existing user AND
 *      the provider verified the email, link automatically.
 *   3. If the email matches an existing user but is NOT verified by the
 *      provider, return `requires_explicit_link` — caller redirects to
 *      a "log in to your existing account first" UX.
 *   4. Otherwise, create a new user (no password) + workspace + the
 *      OAuth row, and sign in.
 *
 * This module is provider-agnostic on purpose: Google, future Microsoft /
 * Apple / GitHub all funnel through `applyOAuthLinkingPolicy`. The provider
 * adapter (e.g. `auth/oauth-google.ts`) is responsible for normalising
 * `emailVerified` correctly for that provider.
 */

import { eq, and } from 'drizzle-orm';
import { users, oauthAccounts, type Db } from '@k-os/db';
import { createWorkspaceForUserTx } from './workspace';

export interface OAuthIdentity {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  /** Display name from the provider; falls back to email local-part on user creation. */
  displayName: string | null;
}

export type LinkingResult =
  | { kind: 'signed_in_existing'; userId: string }
  | { kind: 'linked_existing'; userId: string }
  | { kind: 'created_new'; userId: string }
  | { kind: 'requires_explicit_link'; email: string };

/**
 * Apply the linking policy and return what to do next. Performs every
 * required write (insert oauth_accounts row, create user + workspace);
 * caller only handles session minting + redirect.
 */
export async function applyOAuthLinkingPolicy(
  db: Db,
  identity: OAuthIdentity,
): Promise<LinkingResult> {
  const email = identity.email.trim().toLowerCase();

  // (1) OAuth account already linked — same identity, just sign in.
  const [existingLink] = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, identity.provider),
        eq(oauthAccounts.providerUserId, identity.providerUserId),
      ),
    )
    .limit(1);

  if (existingLink) {
    return { kind: 'signed_in_existing', userId: existingLink.userId };
  }

  // (2) / (3) Email matches an existing user — auto-link iff verified.
  const [existingUser] = await db
    .select({ id: users.id, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    if (!identity.emailVerified) {
      return { kind: 'requires_explicit_link', email };
    }
    await db.insert(oauthAccounts).values({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      userId: existingUser.id,
      email,
    });
    // The provider's verification claim doubles as our email-verified marker
    // if we hadn't already set it.
    if (!existingUser.emailVerifiedAt) {
      await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    }
    return { kind: 'linked_existing', userId: existingUser.id };
  }

  // (4) New user. Display name falls back to email local-part — same
  // policy as magic-link signup.
  const localPart = email.split('@')[0] ?? email;
  const displayName = identity.displayName?.trim() || localPart;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        email,
        displayName,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
      })
      .returning({ id: users.id });

    await tx.insert(oauthAccounts).values({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      userId: created.id,
      email,
    });

    await createWorkspaceForUserTx(tx, { userId: created.id });

    return { kind: 'created_new', userId: created.id };
  });
}
