import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export type Db = ReturnType<typeof createDbClient>;

/**
 * Build a Drizzle client from a Postgres connection string.
 * Use this in code that receives the URL explicitly (tests, scripts).
 */
export function createDbClient(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
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
