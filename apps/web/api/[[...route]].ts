/**
 * Vercel Serverless Function — Hono API entrypoint.
 *
 * The catch-all filename `[[...route]].ts` makes this function handle every
 * request under /api/*. The Hono app from @k-os/api lives in
 * packages/api/src/index.ts and is reused without Vercel-specific changes.
 *
 * Per ADR 0009, this runs on the Node runtime (default for serverless
 * functions in package.json `engines: node@22`). Edge runtime is
 * incompatible with `oslo` (Node crypto) and `nodemailer` (SMTP).
 */

import { handle } from 'hono/vercel';
import { app } from '@k-os/api';

// `runtime: 'nodejs'` is the default; explicit for clarity.
export const config = {
  runtime: 'nodejs22.x',
};

export default handle(app);
