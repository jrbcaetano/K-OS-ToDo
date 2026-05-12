/**
 * Enum-shaped value sets used across K-OS.
 *
 * Stored in Postgres as `text` columns with `CHECK` constraints (see
 * docs/schema.md for rationale). The `as const` arrays here are the source of
 * truth — the Drizzle schema imports them and feeds the same lists into the
 * column type and the CHECK constraint.
 */

export const TASK_STATUSES = [
  'inbox',
  'next',
  'scheduled',
  'waiting',
  'delegated',
  'blocked',
  'someday',
  'done',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['critical', 'important', 'routine', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const SOURCE_KINDS = [
  'manual',
  'email',
  'slack',
  'meeting',
  'mobile_capture',
  'calendar',
  'phone',
  'other',
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const PROJECT_STATUSES = ['on_track', 'needs_attention', 'idle', 'blocked'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ARCHIVE_REASONS = ['completed', 'dropped', 'paused', 'replaced'] as const;
export type ArchiveReason = (typeof ARCHIVE_REASONS)[number];

export const WORKSPACE_ROLES = ['owner', 'member', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/**
 * Account-level gate for signup. New users land in 'pending' and cannot log
 * in until a platform admin approves them. Rejected rows are kept (soft
 * delete) for audit; the partial unique index on email lets the address be
 * reused if you want to re-admit them later.
 */
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/**
 * Workspace-independent role. Currently only 'admin' — grants access to the
 * platform settings (registration approval queue lives there).
 */
export const PLATFORM_ROLES = ['admin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/**
 * Emails that are auto-approved + auto-admin on first signup, and promoted
 * to admin via migration if they already exist. v1 keeps this hardcoded; a
 * proper admin-management UI can come later when there's more than one.
 */
export const PLATFORM_ADMIN_EMAILS = ['joao@jrc.pt'] as const;
export function isPlatformAdminEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return PLATFORM_ADMIN_EMAILS.some((e) => e.toLowerCase() === lower);
}

export const ACTOR_KINDS = ['user', 'agent', 'system'] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const VERIFICATION_PURPOSES = ['magic_link', 'email_verify', 'password_reset'] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

/**
 * Default contexts seeded into a new workspace.
 * These match the Project North Star design's `--ctx-*` palette in styles.css.
 * Users can rename / recolour / reorder / add / remove via the UI.
 */
export const DEFAULT_CONTEXTS = [
  { slug: 'boxfusion', label: 'Boxfusion', color: '#5a7a4a', sortOrder: 1 },
  { slug: 'praesto', label: 'Praesto', color: '#6a8a5a', sortOrder: 2 },
  { slug: 'personal', label: 'Personal', color: '#7a5a8a', sortOrder: 3 },
  { slug: 'family', label: 'Family', color: '#b8588a', sortOrder: 4 },
  { slug: 'health', label: 'Health', color: '#a07a3a', sortOrder: 5 },
  { slug: 'home', label: 'Casa', color: '#b8714a', sortOrder: 6 },
] as const;
