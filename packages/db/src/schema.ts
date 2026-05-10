/**
 * K-OS Drizzle schema.
 *
 * Transcription of docs/schema.md. When the schema doc changes, this file
 * MUST be updated to match. Treat docs/schema.md and this file as
 * synchronized. The doc is for human review; this file is the runtime.
 *
 * Conventions (see docs/schema.md):
 *   - UUIDs default via gen_random_uuid()
 *   - timestamps are timestamptz
 *   - workspace_id NOT NULL on every domain row
 *   - enums stored as text + CHECK; arrays come from @k-os/core
 *   - soft-delete via archived_at (NULL = active)
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  date,
  primaryKey,
  unique,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  SOURCE_KINDS,
  PROJECT_STATUSES,
  ARCHIVE_REASONS,
  WORKSPACE_ROLES,
  ACTOR_KINDS,
  VERIFICATION_PURPOSES,
  type RecurringRule,
} from '@k-os/core';

// Helper to render an `IN (...)` SQL fragment for CHECK constraints from a TS array.
const inList = (values: readonly string[]) =>
  sql.raw(`(${values.map((v) => `'${v}'`).join(',')})`);

// ============================================================================
// AUTH & STRUCTURAL
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  avatarColor: text('avatar_color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('sessions_user').on(t.userId).where(sql`revoked_at is null`)],
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerUserId] }),
    index('oauth_accounts_user').on(t.userId),
  ],
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email'),
    purpose: text('purpose', { enum: VERIFICATION_PURPOSES }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (t) => [
    check('verification_tokens_purpose_check', sql`${t.purpose} in ${inList(VERIFICATION_PURPOSES)}`),
    index('verification_tokens_user').on(t.userId),
    index('verification_tokens_email').on(t.email).where(sql`consumed_at is null`),
  ],
);

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: WORKSPACE_ROLES }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    check('workspace_members_role_check', sql`${t.role} in ${inList(WORKSPACE_ROLES)}`),
  ],
);

// Per [[0020 - agent-native-architecture-agents-external-to-platform]]:
// agents are external services that authenticate against the public API
// using a workspace-scoped Agent API key. Only the SHA-256 hash of the raw
// token is stored. Revoke by setting `revoked_at`.
export const agentKeys = pgTable(
  'agent_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull().unique(),
    label: text('label').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('agent_keys_workspace').on(t.workspaceId).where(sql`revoked_at is null`)],
);

// ============================================================================
// REFERENCE & CATALOG
// ============================================================================

export const contexts = pgTable(
  'contexts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    color: text('color').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('contexts_workspace_slug').on(t.workspaceId, t.slug)],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('tags_workspace_name').on(t.workspaceId, t.name)],
);

export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
  contextId: uuid('context_id').references(() => contexts.id, { onDelete: 'set null' }),
  role: text('role'),
  color: text('color').notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  nextMeetingAt: timestamp('next_meeting_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

// ============================================================================
// OUTCOMES & RESPONSIBILITIES
// ============================================================================

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    outcome: text('outcome').notNull(),
    contextId: uuid('context_id').references(() => contexts.id, { onDelete: 'set null' }),
    status: text('status', { enum: PROJECT_STATUSES }).notNull().default('on_track'),
    targetDate: date('target_date'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    archiveReason: text('archive_reason', { enum: ARCHIVE_REASONS }),
    archiveNote: text('archive_note'),
    archivedBy: uuid('archived_by').references(() => users.id),
  },
  (t) => [
    check('projects_status_check', sql`${t.status} in ${inList(PROJECT_STATUSES)}`),
    check(
      'projects_archive_reason_check',
      sql`${t.archiveReason} is null or ${t.archiveReason} in ${inList(ARCHIVE_REASONS)}`,
    ),
  ],
);

export const areas = pgTable(
  'areas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    standard: text('standard').notNull(),
    contextId: uuid('context_id').references(() => contexts.id, { onDelete: 'set null' }),
    cadence: text('cadence'),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    archiveReason: text('archive_reason', { enum: ARCHIVE_REASONS }),
    archiveNote: text('archive_note'),
    archivedBy: uuid('archived_by').references(() => users.id),
  },
  (t) => [
    check(
      'areas_archive_reason_check',
      sql`${t.archiveReason} is null or ${t.archiveReason} in ${inList(ARCHIVE_REASONS)}`,
    ),
  ],
);

export const projectPeople = pgTable(
  'project_people',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    role: text('role'),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.personId] })],
);

export const areaPeople = pgTable(
  'area_people',
  {
    areaId: uuid('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    role: text('role'),
  },
  (t) => [primaryKey({ columns: [t.areaId, t.personId] })],
);

// ============================================================================
// TASKS
// ============================================================================

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),

    status: text('status', { enum: TASK_STATUSES }).notNull().default('next'),
    priority: text('priority', { enum: TASK_PRIORITIES }).notNull().default('routine'),

    contextId: uuid('context_id').references(() => contexts.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
    personId: uuid('person_id').references(() => people.id, { onDelete: 'set null' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),

    sourceKind: text('source_kind', { enum: SOURCE_KINDS }),
    sourceRef: text('source_ref'),

    dueAt: timestamp('due_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    reviewAt: timestamp('review_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    recurringRule: jsonb('recurring_rule').$type<RecurringRule>(),
    parentRecurringId: uuid('parent_recurring_id').references((): AnyPgColumn => tasks.id),

    waitingFor: text('waiting_for'),
    waitingSince: timestamp('waiting_since', { withTimezone: true }),

    aiParsed: jsonb('ai_parsed'),

    position: integer('position'),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    check('tasks_status_check', sql`${t.status} in ${inList(TASK_STATUSES)}`),
    check('tasks_priority_check', sql`${t.priority} in ${inList(TASK_PRIORITIES)}`),
    check(
      'tasks_source_kind_check',
      sql`${t.sourceKind} is null or ${t.sourceKind} in ${inList(SOURCE_KINDS)}`,
    ),
    index('tasks_workspace_status_due')
      .on(t.workspaceId, t.status, t.dueAt)
      .where(sql`archived_at is null and recurring_rule is null`),
    index('tasks_workspace_status_scheduled')
      .on(t.workspaceId, t.status, t.scheduledAt)
      .where(sql`archived_at is null and recurring_rule is null`),
    index('tasks_workspace_person_status')
      .on(t.workspaceId, t.personId, t.status)
      .where(sql`archived_at is null`),
    index('tasks_workspace_project')
      .on(t.workspaceId, t.projectId)
      .where(sql`archived_at is null and project_id is not null`),
    index('tasks_workspace_area')
      .on(t.workspaceId, t.areaId)
      .where(sql`archived_at is null and area_id is not null`),
    index('tasks_workspace_waiting')
      .on(t.workspaceId, t.reviewAt)
      .where(sql`status in ('waiting','delegated') and archived_at is null`),
    index('tasks_workspace_inbox')
      .on(t.workspaceId, t.createdAt)
      .where(sql`status = 'inbox' and archived_at is null`),
    index('tasks_recurring_template')
      .on(t.workspaceId)
      .where(sql`recurring_rule is not null`),
  ],
);

export const taskTags = pgTable(
  'task_tags',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

export const taskEvents = pgTable(
  'task_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    actorKind: text('actor_kind', { enum: ACTOR_KINDS }).notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('task_events_actor_kind_check', sql`${t.actorKind} in ${inList(ACTOR_KINDS)}`),
    index('task_events_task_created').on(t.taskId, t.createdAt),
  ],
);
