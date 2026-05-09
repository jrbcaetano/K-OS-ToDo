/**
 * Thin fetch wrapper for the K-OS API.
 *
 * The API is mounted under `/api/*` via the Vercel adapter
 * (apps/web/api/[[...route]].ts → Hono). All requests share the same
 * session cookie (`k_os_session`); we always pass `credentials: 'include'`
 * so the cookie travels even on cross-origin dev setups.
 *
 * One goal: keep this file the only place that knows about endpoint
 * shapes. Hooks in `useQueries.ts` import `apiGet` / `apiSend` and
 * type the response shape inline.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`api_error_${status}`);
    this.name = 'ApiError';
  }
}

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const init: RequestInit = {
    method,
    credentials: 'include',
  };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, init);
  const text = await res.text();
  const json = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, json);
  }
  return json;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request('GET', path) as Promise<T>;
}

export function apiSend<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  return request(method, path, body) as Promise<T>;
}
