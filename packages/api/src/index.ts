import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

import passwordRoutes from './routes/auth/password';
import magicLinkRoutes from './routes/auth/magic-link';
import googleOAuthRoutes from './routes/auth/oauth-google';
import sessionRoutes from './routes/auth/session';
import tasksRoutes from './routes/tasks';
import inboxRoutes from './routes/inbox';
import projectsRoutes from './routes/projects';
import areasRoutes from './routes/areas';
import peopleRoutes from './routes/people';
import contextsRoutes from './routes/contexts';
import tagsRoutes from './routes/tags';
import agentsRoutes from './routes/agents';
import adminRoutes from './routes/admin';
import cronRoutes from './routes/cron';
import { requireAuth, type AuthVariables } from './middleware/auth';

/**
 * The K-OS API. Hono app, framework-agnostic.
 *
 * Per [[0020 - agent-native-architecture-agents-external-to-platform]] the
 * platform exposes a public API for both humans (session cookie) and
 * agents (Bearer agent key). The platform itself does not call LLMs;
 * agents are external services that read and write through these routes.
 *
 * Mounted on Vercel via apps/web/api/[[...route]].ts which delegates here.
 * Can also be served standalone (Node, Bun) without changes.
 */
export const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => c.json({ name: 'k-os-api', status: 'ok' }));
app.get('/health', (c) => c.json({ ok: true }));

// Auth — public; cannot require a session, since these routes mint sessions.
app.route('/auth/password', passwordRoutes);
app.route('/auth/magic-link', magicLinkRoutes);
app.route('/auth/oauth/google', googleOAuthRoutes);
app.route('/auth/session', sessionRoutes);

// Cron — gated by CRON_SECRET, NOT by requireAuth.
app.route('/cron', cronRoutes);

// Every domain route requires a valid actor (session cookie OR agent key).
// Hono's `/tasks/*` matches `/tasks/anything` but not `/tasks` alone, so we
// register both patterns for each protected mount.
const PROTECTED_PREFIXES = [
  '/tasks',
  '/inbox',
  '/projects',
  '/areas',
  '/people',
  '/contexts',
  '/tags',
  '/agents',
  '/admin',
] as const;
for (const prefix of PROTECTED_PREFIXES) {
  app.use(prefix, requireAuth);
  app.use(`${prefix}/*`, requireAuth);
}

// Domain
app.route('/tasks', tasksRoutes);
app.route('/inbox', inboxRoutes);
app.route('/projects', projectsRoutes);
app.route('/areas', areasRoutes);
app.route('/people', peopleRoutes);
app.route('/contexts', contextsRoutes);
app.route('/tags', tagsRoutes);

// Agents — workspace-scoped Agent API key management (issue / list / revoke).
app.route('/agents', agentsRoutes);

// Admin (user-triggered ops)
app.route('/admin', adminRoutes);

export type AppType = typeof app;
