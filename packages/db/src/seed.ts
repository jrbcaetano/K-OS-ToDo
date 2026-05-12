/**
 * Seed script — populates an existing workspace with the canonical North Star
 * sample data so a fresh signup can exercise every screen.
 *
 * Usage (from project root):
 *   pnpm --filter @k-os/db seed -- <email>
 *
 * Idempotent: wipes the workspace's domain rows (tasks, projects, areas,
 * people, tags) before re-inserting. Leaves auth + workspace + contexts
 * (created at signup) intact.
 *
 * Source data: design/project-north-start/project/data.js. Anything visible
 * in the prototype screens should appear here.
 */

import { eq, inArray } from 'drizzle-orm';
import {
  users,
  workspaces,
  workspaceMembers,
  contexts as contextsTable,
  people as peopleTable,
  projects as projectsTable,
  areas as areasTable,
  projectPeople,
  areaPeople,
  tags as tagsTable,
  tasks as tasksTable,
  taskTags,
  taskEvents,
} from './schema';
import { getDb } from './client';

// ---------------------------------------------------------------------------
// Date helpers — everything is relative to `now()` so the seed feels alive.
// ---------------------------------------------------------------------------

const now = new Date();

function atToday(hour: number, minute = 0): Date {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function daysAgo(days: number): Date {
  return addDays(now, -days);
}

const TODAY = atToday(18); // arbitrary fixed time "today"
const TOMORROW = addDays(TODAY, 1);
const FRIDAY_AM = addDays(atToday(9, 30), ((5 - now.getDay() + 7) % 7) || 7);

// ---------------------------------------------------------------------------
// People (8) — keyed by the design's `id` string so we can wire FKs.
// ---------------------------------------------------------------------------

const SEED_PEOPLE = [
  { key: 'andy',     name: 'Andy Mendes',    initials: 'AM', ctxSlug: 'boxfusion', role: 'Direct report · Delivery Lead', color: '#b8714a', lastSeenDaysAgo: 2 },
  { key: 'paola',    name: 'Paola Ribeiro',  initials: 'PR', ctxSlug: 'boxfusion', role: 'People Operations',             color: '#8a6a4a', lastSeenDaysAgo: 0 },
  { key: 'pedro',    name: 'Pedro Costa',    initials: 'PC', ctxSlug: 'praesto',   role: 'Praesto · Senior Engineer',     color: '#7a8a5a', lastSeenDaysAgo: 0 },
  { key: 'cahil',    name: 'Cahil Patel',    initials: 'CP', ctxSlug: 'boxfusion', role: 'Direct report · Engineer',      color: '#5a7a8a', lastSeenDaysAgo: 7 },
  { key: 'telma',    name: 'Telma',          initials: 'TL', ctxSlug: 'family',    role: 'Family',                        color: '#b8588a', lastSeenDaysAgo: 0 },
  { key: 'catarina', name: 'Catarina',       initials: 'CT', ctxSlug: 'family',    role: 'Family · Daughter',             color: '#a85a8a', lastSeenDaysAgo: 0 },
  { key: 'marco',    name: 'Marco Vieira',   initials: 'MV', ctxSlug: 'praesto',   role: 'Praesto · Customer Lead',       color: '#6a8a5a', lastSeenDaysAgo: 3 },
  { key: 'rita',     name: 'Rita Almeida',   initials: 'RA', ctxSlug: 'boxfusion', role: 'Stakeholder · Acme',            color: '#8a5a8a', lastSeenDaysAgo: 7 },
] as const;

// ---------------------------------------------------------------------------
// Projects (5 active + 4 archived) — keyed by design's `id` string.
// ---------------------------------------------------------------------------

const SEED_PROJECTS = [
  { key: 'fl-launch',  name: 'Future Life launch',          outcome: 'Ship Praesto Future Life pilot to 3 customers by end Q2.', ctxSlug: 'praesto',   status: 'on_track' as const,         targetDate: addDays(now, 50),  peopleKeys: ['pedro', 'marco'] },
  { key: 'appraisals', name: 'Boxfusion appraisals 2026 H1', outcome: 'Run mid-year cycle for 14 directs and skip-levels.',     ctxSlug: 'boxfusion', status: 'needs_attention' as const,  targetDate: addDays(now, 33),  peopleKeys: ['andy', 'cahil', 'paola'] },
  { key: 'casa-reno',  name: 'Casa renovation',             outcome: 'Finish kitchen + bathroom rework.',                       ctxSlug: 'home',      status: 'on_track' as const,         targetDate: addDays(now, 95),  peopleKeys: ['telma'] },
  { key: 'hiring',     name: 'Q2 senior hiring',            outcome: 'Two senior engineers signed by July.',                    ctxSlug: 'boxfusion', status: 'on_track' as const,         targetDate: addDays(now, 79),  peopleKeys: ['paola'] },
  { key: 'fitness',    name: 'Get back to running',         outcome: '10km in 50 min by August.',                               ctxSlug: 'health',    status: 'idle' as const,             targetDate: addDays(now, 111), peopleKeys: [] as string[] },
];

const SEED_ARCHIVED_PROJECTS = [
  { name: 'Boxfusion rebrand',     outcome: 'New visual identity rolled out across all touchpoints.', ctxSlug: 'boxfusion', archiveReason: 'completed' as const, archiveNote: 'Shipped on time. Keep deck for case study.',                  archivedDaysAgo: 30,  peopleKeys: ['paola'] },
  { name: 'Future Life pilot 0',   outcome: 'Validate concept with one design partner.',              ctxSlug: 'praesto',   archiveReason: 'completed' as const, archiveNote: 'Learnings folded into Future Life launch.',                   archivedDaysAgo: 80,  peopleKeys: ['pedro', 'marco'] },
  { name: 'Web Summit keynote',    outcome: 'Keynote slot accepted and prepped.',                     ctxSlug: 'praesto',   archiveReason: 'dropped' as const,   archiveNote: 'Decided not to apply for 2026. Revisit Q4.',                  archivedDaysAgo: 70,  peopleKeys: [] as string[] },
  { name: 'Find an exec coach',    outcome: 'Engage a coach for biweekly sessions.',                  ctxSlug: 'personal',  archiveReason: 'paused' as const,    archiveNote: 'Two intro calls, no fit. Will pick up if budget frees in H2.', archivedDaysAgo: 110, peopleKeys: [] as string[] },
];

// ---------------------------------------------------------------------------
// Areas (7 active + 2 archived).
// ---------------------------------------------------------------------------

const SEED_AREAS = [
  { key: 'bx-people',    name: 'Boxfusion · People',      standard: 'Every direct gets 1:1 every 2 weeks; appraisal cadence on time.', ctxSlug: 'boxfusion', cadence: 'weekly',  peopleKeys: ['andy', 'cahil', 'paola'] },
  { key: 'bx-delivery',  name: 'Boxfusion · Delivery',    standard: 'Customer trust signals tracked weekly; no surprise escalations.', ctxSlug: 'boxfusion', cadence: 'weekly',  peopleKeys: ['andy', 'rita'] },
  { key: 'praesto-ops',  name: 'Praesto · Operations',    standard: 'Roadmap reviewed monthly; pipeline coverage 3x.',                ctxSlug: 'praesto',   cadence: 'monthly', peopleKeys: ['pedro', 'marco'] },
  { key: 'health',       name: 'Health',                  standard: 'Move 4x/week; sleep 7h+; check-ups on schedule.',                ctxSlug: 'health',    cadence: 'weekly',  peopleKeys: [] as string[] },
  { key: 'casa',         name: 'Casa',                    standard: 'House runs without fires; bills, repairs, supplies handled.',    ctxSlug: 'home',      cadence: 'weekly',  peopleKeys: ['telma'] },
  { key: 'telma',        name: 'Telma',                   standard: 'Connection over logistics. Plan one slow evening per week.',     ctxSlug: 'family',    cadence: 'weekly',  peopleKeys: ['telma'] },
  { key: 'catarina',     name: 'Catarina',                standard: 'Be present. School things on time. Saturdays protected.',        ctxSlug: 'family',    cadence: 'weekly',  peopleKeys: ['catarina'] },
];

const SEED_ARCHIVED_AREAS = [
  { name: 'Board · Acme advisory',  standard: 'Quarterly board pack on time; quiet between.', ctxSlug: 'boxfusion', archiveReason: 'paused' as const,   archiveNote: 'Term ended. Handover doc with Rita.',                          archivedDaysAgo: 20,  peopleKeys: ['rita'] },
  { name: 'Praesto · Part-time mode', standard: '2 days/week, founder coverage clear.',       ctxSlug: 'praesto',   archiveReason: 'replaced' as const, archiveNote: 'Folded into Praesto · Operations after going full-time.',     archivedDaysAgo: 125, peopleKeys: ['pedro'] },
];

// ---------------------------------------------------------------------------
// Tags — used by a few tasks for the tags screen.
// ---------------------------------------------------------------------------

const SEED_TAGS = ['focus', 'low-energy', 'errand', 'reading'];

// ---------------------------------------------------------------------------
// Tasks — across every status and screen. `projectKey` / `areaKey` /
// `personKey` are resolved to ids after the parent rows are inserted.
// ---------------------------------------------------------------------------

interface SeedTask {
  title: string;
  description?: string;
  status: 'inbox' | 'next' | 'scheduled' | 'waiting' | 'delegated' | 'blocked' | 'someday' | 'done';
  priority: 'critical' | 'important' | 'routine' | 'low';
  ctxSlug: string;
  projectKey?: string;
  areaKey?: string;
  personKey?: string;
  sourceKind?: 'manual' | 'email' | 'slack' | 'meeting' | 'mobile_capture' | 'calendar' | 'phone' | 'other';
  dueAt?: Date | null;
  scheduledAt?: Date | null;
  reviewAt?: Date | null;
  waitingFor?: string;
  waitingSince?: Date;
  tagNames?: string[];
}

const SEED_TASKS: SeedTask[] = [
  // ─── Focus today ─────────────────────────────────────────────────────────
  { title: "Review Cahil's draft self-review and send notes back", status: 'next', priority: 'important', ctxSlug: 'boxfusion', projectKey: 'appraisals', personKey: 'cahil', dueAt: TODAY, tagNames: ['focus'] },
  { title: 'Decide pilot customer 3 for Future Life — call Marco',  status: 'next', priority: 'critical',  ctxSlug: 'praesto',   projectKey: 'fl-launch', personKey: 'marco', dueAt: TODAY, tagNames: ['focus'] },
  { title: 'Write loop summary for senior eng candidate B',         status: 'next', priority: 'important', ctxSlug: 'boxfusion', projectKey: 'hiring',    personKey: 'paola', dueAt: TODAY },

  // ─── Due today ───────────────────────────────────────────────────────────
  { title: 'Approve invoice for Acme statement of work',            status: 'next', priority: 'critical', ctxSlug: 'boxfusion', areaKey: 'bx-delivery', dueAt: TODAY },
  { title: "Send Catarina's school form back",                       status: 'next', priority: 'routine',  ctxSlug: 'family',    areaKey: 'catarina',     personKey: 'catarina', dueAt: TODAY },
  { title: 'Pick up dry cleaning before 18:00',                      status: 'next', priority: 'low',      ctxSlug: 'home',      areaKey: 'casa',         dueAt: atToday(18), tagNames: ['errand', 'low-energy'] },

  // ─── Overdue ─────────────────────────────────────────────────────────────
  { title: 'Book physio appointment for left knee',                  status: 'next', priority: 'important', ctxSlug: 'health',    projectKey: 'fitness', dueAt: daysAgo(3), tagNames: ['errand'] },
  { title: 'Reply to Rita on revised SOW scope',                     status: 'next', priority: 'critical',  ctxSlug: 'boxfusion', areaKey: 'bx-delivery', personKey: 'rita', dueAt: daysAgo(1) },

  // ─── Waiting / delegated (Follow-ups today) ──────────────────────────────
  { title: 'Andy — salary review for Cahil',                         status: 'waiting',   priority: 'important', ctxSlug: 'boxfusion', projectKey: 'appraisals', personKey: 'andy',  waitingFor: 'Andy',  waitingSince: daysAgo(5),  reviewAt: TODAY,    sourceKind: 'meeting' },
  { title: 'Pedro — staging deploy for Future Life pilot',           status: 'delegated', priority: 'important', ctxSlug: 'praesto',   projectKey: 'fl-launch',  personKey: 'pedro', waitingFor: 'Pedro', waitingSince: daysAgo(2),  reviewAt: TODAY,    sourceKind: 'slack' },

  // ─── Scheduled (calendar-ish today) ──────────────────────────────────────
  { title: '1:1 with Andy — appraisal calibration',                  status: 'scheduled', priority: 'routine', ctxSlug: 'boxfusion', areaKey: 'bx-people', personKey: 'andy',  scheduledAt: atToday(14) },
  { title: 'Casa — countertop sample review with Telma',             status: 'scheduled', priority: 'routine', ctxSlug: 'home',      projectKey: 'casa-reno', personKey: 'telma', scheduledAt: atToday(19, 30) },

  // ─── Inbox (capture, awaiting clarify) ───────────────────────────────────
  { title: 'Andy mentioned: Cahil might want a different title — explore',          description: "Came up at the end of our 1:1. Andy thinks Cahil's been doing more architecture work than his title reflects, and a re-leveling could come up at the appraisal. Worth thinking about before next month.",  status: 'inbox', priority: 'routine', ctxSlug: 'boxfusion', personKey: 'andy',  sourceKind: 'meeting' },
  { title: 'Rita asked where the recruitment forms are stored',                     description: 'Rita needs the candidate paperwork template before Friday. Paola probably knows. Quick ping then move on.',                                                                                                       status: 'inbox', priority: 'routine', ctxSlug: 'boxfusion', personKey: 'rita',  sourceKind: 'email' },
  { title: 'Catarina school trip permission slip — sign and return',                description: 'Snapped the form at school pickup. Due back next Wednesday.',                                                                                                                                                     status: 'inbox', priority: 'routine', ctxSlug: 'family',    personKey: 'catarina', sourceKind: 'mobile_capture' },
  { title: 'Investigate slow login on Future Life staging',                         description: "Pedro flagged 4-second auth on the pilot env. Could be cold-start, could be the new auth provider. Triage before Marco's demo Friday.",                                                                          status: 'inbox', priority: 'important', ctxSlug: 'praesto',   personKey: 'pedro', sourceKind: 'slack' },
  { title: 'Book annual health check — overdue by 6 weeks',                         description: 'Reminder fired again this morning. Need to actually call.',                                                                                                                                                      status: 'inbox', priority: 'important', ctxSlug: 'health',                          sourceKind: 'calendar' },

  // ─── Waiting screen (broader follow-up list) ─────────────────────────────
  { title: 'Cahil — draft self-review',                  status: 'waiting',   priority: 'important', ctxSlug: 'boxfusion', projectKey: 'appraisals', personKey: 'cahil',  waitingFor: 'Cahil',  waitingSince: daysAgo(8),  reviewAt: TODAY,    sourceKind: 'calendar' },
  { title: 'Andy — calibration notes for skip-levels',   status: 'waiting',   priority: 'important', ctxSlug: 'boxfusion', projectKey: 'appraisals', personKey: 'andy',   waitingFor: 'Andy',   waitingSince: daysAgo(5),  reviewAt: TOMORROW, sourceKind: 'meeting' },
  { title: 'Rita — revised SOW redlines',                status: 'waiting',   priority: 'important', ctxSlug: 'boxfusion', areaKey: 'bx-delivery',    personKey: 'rita',   waitingFor: 'Rita',   waitingSince: daysAgo(12), reviewAt: daysAgo(2), sourceKind: 'email' },
  { title: 'Marco — pilot customer 3 confirmation',      status: 'waiting',   priority: 'important', ctxSlug: 'praesto',   projectKey: 'fl-launch',  personKey: 'marco',  waitingFor: 'Marco',  waitingSince: daysAgo(4),  reviewAt: TOMORROW, sourceKind: 'email' },
  { title: 'Paola — recruitment form template link',     status: 'waiting',   priority: 'routine',   ctxSlug: 'boxfusion', projectKey: 'hiring',     personKey: 'paola',  waitingFor: 'Paola',  waitingSince: daysAgo(1),  reviewAt: addDays(now, 2), sourceKind: 'slack' },
  { title: 'Physio — confirm Tuesday slot',              status: 'waiting',   priority: 'routine',   ctxSlug: 'health',    projectKey: 'fitness',                       waitingFor: '(physio clinic)', waitingSince: daysAgo(3), reviewAt: TOMORROW, sourceKind: 'phone' },
  { title: 'Marco — pricing approval from his CFO',      status: 'waiting',   priority: 'important', ctxSlug: 'praesto',   projectKey: 'fl-launch',  personKey: 'marco',  waitingFor: 'Marco',  waitingSince: daysAgo(9),  reviewAt: daysAgo(1), sourceKind: 'meeting' },

  // ─── Upcoming (next 14 days) ─────────────────────────────────────────────
  { title: 'Prep slides for board update',               status: 'next', priority: 'important', ctxSlug: 'boxfusion', areaKey: 'bx-delivery',   scheduledAt: addDays(now, 3) },
  { title: 'Marco demo dry-run',                         status: 'next', priority: 'important', ctxSlug: 'praesto',   projectKey: 'fl-launch', personKey: 'marco', scheduledAt: addDays(now, 4) },
  { title: 'Review reading list — Q2 architecture book', status: 'next', priority: 'routine',   ctxSlug: 'personal',                                                  scheduledAt: addDays(now, 6), tagNames: ['reading'] },
  { title: 'Run loop for senior eng candidate B',        status: 'scheduled', priority: 'important', ctxSlug: 'boxfusion', projectKey: 'hiring', personKey: 'paola', scheduledAt: FRIDAY_AM },

  // ─── Someday ─────────────────────────────────────────────────────────────
  { title: 'Look into 5k summer fun run',                status: 'someday', priority: 'low', ctxSlug: 'health', projectKey: 'fitness' },
  { title: 'Plan trip to Algarve in October',            status: 'someday', priority: 'low', ctxSlug: 'family', areaKey: 'casa', personKey: 'telma' },

  // ─── Done (recently completed — for Review screen) ───────────────────────
  { title: 'Ship Sprint 14 review deck',                 status: 'done', priority: 'routine', ctxSlug: 'boxfusion', areaKey: 'bx-delivery' },
  { title: 'Quarterly board pre-read',                   status: 'done', priority: 'routine', ctxSlug: 'boxfusion', areaKey: 'bx-delivery' },
  { title: 'Sign Catarina up for piano',                 status: 'done', priority: 'routine', ctxSlug: 'family',    areaKey: 'catarina',     personKey: 'catarina' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // pnpm forwards the literal `--` separator, so filter it out and take the
  // first remaining arg as the email.
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const email = args[0];
  if (!email) {
    console.error('Usage: pnpm --filter @k-os/db seed -- <email>');
    process.exit(1);
  }
  const normalizedEmail = email.trim().toLowerCase();

  const db = getDb();

  // 1) Resolve user → workspace.
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (!user) {
    console.error(`No user with email ${normalizedEmail}. Sign up first, then re-run.`);
    process.exit(1);
  }
  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);
  if (!ws) {
    console.error(`User ${user.email} has no workspace. Log in once to trigger the self-heal, then re-run.`);
    process.exit(1);
  }
  console.log(`▸ Seeding workspace "${ws.name}" (${ws.id}) for ${user.email}`);

  // 2) Load existing contexts (created at signup).
  const ctxRows = await db
    .select({ id: contextsTable.id, slug: contextsTable.slug })
    .from(contextsTable)
    .where(eq(contextsTable.workspaceId, ws.id));
  const ctxBySlug = new Map(ctxRows.map((c) => [c.slug, c.id] as const));
  if (ctxBySlug.size === 0) {
    console.error('No contexts found for workspace — was signup interrupted? Aborting.');
    process.exit(1);
  }

  // 3) Wipe domain rows for this workspace. Order matters: child rows first.
  await db.transaction(async (tx) => {
    const taskIds = await tx
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(eq(tasksTable.workspaceId, ws.id));
    if (taskIds.length > 0) {
      const ids = taskIds.map((t) => t.id);
      await tx.delete(taskEvents).where(inArray(taskEvents.taskId, ids));
      await tx.delete(taskTags).where(inArray(taskTags.taskId, ids));
      await tx.delete(tasksTable).where(eq(tasksTable.workspaceId, ws.id));
    }
    const projIds = await tx
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.workspaceId, ws.id));
    if (projIds.length > 0) {
      await tx.delete(projectPeople).where(inArray(projectPeople.projectId, projIds.map((p) => p.id)));
      await tx.delete(projectsTable).where(eq(projectsTable.workspaceId, ws.id));
    }
    const areaIds = await tx
      .select({ id: areasTable.id })
      .from(areasTable)
      .where(eq(areasTable.workspaceId, ws.id));
    if (areaIds.length > 0) {
      await tx.delete(areaPeople).where(inArray(areaPeople.areaId, areaIds.map((a) => a.id)));
      await tx.delete(areasTable).where(eq(areasTable.workspaceId, ws.id));
    }
    await tx.delete(peopleTable).where(eq(peopleTable.workspaceId, ws.id));
    await tx.delete(tagsTable).where(eq(tagsTable.workspaceId, ws.id));
  });
  console.log('▸ Wiped existing domain rows');

  // 4) Insert people.
  const peopleByKey = new Map<string, string>();
  for (const p of SEED_PEOPLE) {
    const [row] = await db
      .insert(peopleTable)
      .values({
        workspaceId: ws.id,
        name: p.name,
        initials: p.initials,
        color: p.color,
        contextId: ctxBySlug.get(p.ctxSlug) ?? null,
        role: p.role,
        lastSeenAt: daysAgo(p.lastSeenDaysAgo),
        createdBy: user.id,
      })
      .returning({ id: peopleTable.id });
    peopleByKey.set(p.key, row.id);
  }
  console.log(`▸ Inserted ${peopleByKey.size} people`);

  // 5) Insert tags.
  const tagsByName = new Map<string, string>();
  for (const name of SEED_TAGS) {
    const [row] = await db
      .insert(tagsTable)
      .values({ workspaceId: ws.id, name })
      .returning({ id: tagsTable.id });
    tagsByName.set(name, row.id);
  }
  console.log(`▸ Inserted ${tagsByName.size} tags`);

  // 6) Insert projects + project_people.
  const projectsByKey = new Map<string, string>();
  for (const p of SEED_PROJECTS) {
    const [row] = await db
      .insert(projectsTable)
      .values({
        workspaceId: ws.id,
        name: p.name,
        outcome: p.outcome,
        contextId: ctxBySlug.get(p.ctxSlug) ?? null,
        status: p.status,
        targetDate: p.targetDate.toISOString().slice(0, 10),
        createdBy: user.id,
      })
      .returning({ id: projectsTable.id });
    projectsByKey.set(p.key, row.id);
    for (const personKey of p.peopleKeys) {
      const personId = peopleByKey.get(personKey);
      if (personId) {
        await db.insert(projectPeople).values({ projectId: row.id, personId, role: null });
      }
    }
  }
  // Archived projects (visible on /projects?archived=true).
  for (const p of SEED_ARCHIVED_PROJECTS) {
    const archivedAt = daysAgo(p.archivedDaysAgo);
    const [row] = await db
      .insert(projectsTable)
      .values({
        workspaceId: ws.id,
        name: p.name,
        outcome: p.outcome,
        contextId: ctxBySlug.get(p.ctxSlug) ?? null,
        status: 'on_track',
        targetDate: addDays(archivedAt, -30).toISOString().slice(0, 10),
        createdBy: user.id,
        archivedAt,
        archiveReason: p.archiveReason,
        archiveNote: p.archiveNote,
        archivedBy: user.id,
      })
      .returning({ id: projectsTable.id });
    for (const personKey of p.peopleKeys) {
      const personId = peopleByKey.get(personKey);
      if (personId) {
        await db.insert(projectPeople).values({ projectId: row.id, personId, role: null });
      }
    }
  }
  console.log(`▸ Inserted ${SEED_PROJECTS.length} projects + ${SEED_ARCHIVED_PROJECTS.length} archived`);

  // 7) Insert areas + area_people.
  const areasByKey = new Map<string, string>();
  for (const a of SEED_AREAS) {
    const [row] = await db
      .insert(areasTable)
      .values({
        workspaceId: ws.id,
        name: a.name,
        standard: a.standard,
        contextId: ctxBySlug.get(a.ctxSlug) ?? null,
        cadence: a.cadence,
        createdBy: user.id,
      })
      .returning({ id: areasTable.id });
    areasByKey.set(a.key, row.id);
    for (const personKey of a.peopleKeys) {
      const personId = peopleByKey.get(personKey);
      if (personId) {
        await db.insert(areaPeople).values({ areaId: row.id, personId, role: null });
      }
    }
  }
  for (const a of SEED_ARCHIVED_AREAS) {
    const archivedAt = daysAgo(a.archivedDaysAgo);
    const [row] = await db
      .insert(areasTable)
      .values({
        workspaceId: ws.id,
        name: a.name,
        standard: a.standard,
        contextId: ctxBySlug.get(a.ctxSlug) ?? null,
        cadence: 'monthly',
        createdBy: user.id,
        archivedAt,
        archiveReason: a.archiveReason,
        archiveNote: a.archiveNote,
        archivedBy: user.id,
      })
      .returning({ id: areasTable.id });
    for (const personKey of a.peopleKeys) {
      const personId = peopleByKey.get(personKey);
      if (personId) {
        await db.insert(areaPeople).values({ areaId: row.id, personId, role: null });
      }
    }
  }
  console.log(`▸ Inserted ${SEED_AREAS.length} areas + ${SEED_ARCHIVED_AREAS.length} archived`);

  // 8) Insert tasks (+ task_tags + a single creation event each).
  for (const t of SEED_TASKS) {
    const [row] = await db
      .insert(tasksTable)
      .values({
        workspaceId: ws.id,
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        priority: t.priority,
        contextId: ctxBySlug.get(t.ctxSlug) ?? null,
        projectId: t.projectKey ? projectsByKey.get(t.projectKey) ?? null : null,
        areaId: t.areaKey ? areasByKey.get(t.areaKey) ?? null : null,
        personId: t.personKey ? peopleByKey.get(t.personKey) ?? null : null,
        ownerId: user.id,
        sourceKind: t.sourceKind ?? null,
        dueAt: t.dueAt ?? null,
        scheduledAt: t.scheduledAt ?? null,
        reviewAt: t.reviewAt ?? null,
        completedAt: t.status === 'done' ? daysAgo(1) : null,
        waitingFor: t.waitingFor ?? null,
        waitingSince: t.waitingSince ?? null,
        createdBy: user.id,
      })
      .returning({ id: tasksTable.id });

    // Tags
    if (t.tagNames && t.tagNames.length > 0) {
      for (const tn of t.tagNames) {
        const tagId = tagsByName.get(tn);
        if (tagId) {
          await db.insert(taskTags).values({ taskId: row.id, tagId });
        }
      }
    }

    // One activity event per task so the detail view has content.
    await db.insert(taskEvents).values({
      taskId: row.id,
      workspaceId: ws.id,
      kind: 'created',
      actorKind: 'user',
      actorUserId: user.id,
      payload: { source: 'seed' },
    });
  }
  console.log(`▸ Inserted ${SEED_TASKS.length} tasks`);

  console.log('✓ Done. Reload the app — Today, Inbox, Upcoming, Waiting, Projects, Areas, People should all light up.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
