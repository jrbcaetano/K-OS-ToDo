import { Hono } from 'hono';

/**
 * Build a stub Hono router that responds 501 Not Implemented to a list of
 * (method, path) pairs. Used during scaffolding so the API surface is
 * shaped correctly before any handler is implemented.
 */
export function stubRouter(
  endpoints: Array<{ method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string }>,
): Hono {
  const app = new Hono();
  for (const { method, path } of endpoints) {
    app.on([method], path, (c) =>
      c.json({ error: 'Not implemented', method, path }, 501),
    );
  }
  return app;
}
