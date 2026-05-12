/**
 * Drizzle DB client — neon-serverless (WebSocket) variant.
 *
 * We use the WebSocket driver (not the HTTP one) because the HTTP driver does
 * not support transactions, and several routes wrap multi-statement work in
 * `db.transaction(...)` (workspace setup, task event emission, inbox
 * approve/decline, recurring materialisation, etc.). With the WebSocket
 * driver, the same `db.transaction()` API works locally (Node 22+ has
 * `WebSocket` globally, with `ws` as the constructor) and on Vercel Node.
 *
 * If a future migration moves the API to the Edge runtime, swap back to
 * `drizzle-orm/neon-http` and refactor the transactional code paths.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';

// In Node we need to wire a WebSocket constructor. In browsers / edge it's
// already a global; setting it here is a no-op in those environments.
neonConfig.webSocketConstructor = ws;

export type Db = ReturnType<typeof createDbClient>;

/**
 * Build a Drizzle client from a Postgres connection string.
 * Use this in code that receives the URL explicitly (tests, scripts).
 */
export function createDbClient(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

/**
 * Build a Drizzle client from `process.env.DATABASE_URL`.
 * Throws if the env var isn't set. Use this in API routes / serverless funcs.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return createDbClient(url);
}
