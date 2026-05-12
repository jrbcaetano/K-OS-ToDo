/**
 * Vercel Serverless Function — Hono API entrypoint.
 *
 * The catch-all filename `[[...route]].ts` makes this function handle every
 * request under /api/*. The Hono app from @k-os/api lives in
 * packages/api/src/index.ts and is reused without Vercel-specific changes.
 *
 * Per ADR 0009 this runs on the Node runtime (the default for serverless
 * functions). Edge runtime is incompatible with `oslo` (Node crypto) and
 * `nodemailer` (SMTP), so we leave the runtime implicit — the Node version
 * is controlled by the project's Node.js Version setting in Vercel.
 */

import { handle } from 'hono/vercel';
import { app } from '@k-os/api';

export default handle(app);
