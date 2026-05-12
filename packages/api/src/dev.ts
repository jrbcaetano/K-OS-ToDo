/**
 * Local development server entry point.
 *
 * Uses @hono/node-server to run the Hono app as a plain Node HTTP server
 * on port 3000. Vite (port 5173) proxies /api/* here so the full stack
 * works with a single `pnpm dev` command.
 *
 * This file is NOT deployed to Vercel — production uses
 * apps/web/api/[[...route]].ts (Vercel Serverless Function).
 */

import { serve } from '@hono/node-server';
import { app } from './index.js';

const PORT = Number(process.env.API_PORT ?? 3000);

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`  ➜  API  http://localhost:${info.port}/api`);
  },
);
