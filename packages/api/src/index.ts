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
import aiRoutes from './routes/ai';

/**
 * The K-OS API. Hono app, framework-agnostic.
 *
 * Mounted on Vercel via apps/web/api/[[...route]].ts which delegates here.
 * Can also be served standalone (Node, Bun, Cloudflare Workers — though
 * Workers requires swapping nodemailer and oslo for Web-Crypto-only equivalents).
 */
export const app = new Hono().basePath('/api');

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => c.json({ name: 'k-os-api', status: 'ok' }));
app.get('/health', (c) => c.json({ ok: true }));

// Auth
app.route('/auth/password', passwordRoutes);
app.route('/auth/magic-link', magicLinkRoutes);
app.route('/auth/oauth/google', googleOAuthRoutes);
app.route('/auth/session', sessionRoutes);

// Domain
app.route('/tasks', tasksRoutes);
app.route('/inbox', inboxRoutes);
app.route('/projects', projectsRoutes);
app.route('/areas', areasRoutes);
app.route('/people', peopleRoutes);
app.route('/contexts', contextsRoutes);
app.route('/tags', tagsRoutes);

// AI
app.route('/ai', aiRoutes);

export type AppType = typeof app;
