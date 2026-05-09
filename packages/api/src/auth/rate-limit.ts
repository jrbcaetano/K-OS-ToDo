/**
 * Per-IP, in-memory token bucket for the auth routes.
 *
 * Per the Block 2 plan: an in-memory limiter is fine for MVP. On Vercel
 * serverless this only protects within a single warm instance — if traffic
 * gets high enough to spawn multiple instances, the effective rate is
 * (configured rate × instance count). That's a known limitation and the
 * mitigation when it matters is to swap this for a Redis-backed limiter
 * (Upstash) without changing the public interface.
 *
 * Three buckets are pre-built for the auth routes:
 *   - signup       — slow (account-creation is a real action)
 *   - login        — moderate
 *   - magicLink    — slow (each call sends an email)
 *
 * Routes pull the bucket they want via `rateLimit(bucketKey)`.
 */

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

interface BucketConfig {
  capacity: number;
  refillIntervalMs: number;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

interface BucketStore {
  config: BucketConfig;
  ips: Map<string, BucketState>;
}

// Bucket presets. Tune per-route via `BUCKETS[<key>]` rather than scattering
// magic numbers across the auth routes.
const BUCKET_CONFIGS = {
  signup: { capacity: 5, refillIntervalMs: 60_000 } satisfies BucketConfig,
  login: { capacity: 10, refillIntervalMs: 60_000 } satisfies BucketConfig,
  magicLink: { capacity: 5, refillIntervalMs: 60_000 } satisfies BucketConfig,
} as const;

export type BucketKey = keyof typeof BUCKET_CONFIGS;

const STORES: Record<BucketKey, BucketStore> = {
  signup: { config: BUCKET_CONFIGS.signup, ips: new Map() },
  login: { config: BUCKET_CONFIGS.login, ips: new Map() },
  magicLink: { config: BUCKET_CONFIGS.magicLink, ips: new Map() },
};

function clientIp(c: Context): string {
  // Vercel and most reverse proxies set this. The leftmost hop is the real
  // client; the rest are proxies. Fall back to a constant so requests with
  // no IP header still get bucketed (one shared bucket; degrades gracefully).
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return c.req.header('x-real-ip')?.trim() ?? 'unknown';
}

/**
 * Try to consume one token from the (bucket, ip) pair. Returns true if
 * allowed. Refills happen lazily — we don't need a background interval.
 */
function tryConsume(store: BucketStore, ip: string): boolean {
  const { capacity, refillIntervalMs } = store.config;
  const now = Date.now();

  let state = store.ips.get(ip);
  if (!state) {
    state = { tokens: capacity, lastRefill: now };
    store.ips.set(ip, state);
  }

  // Refill: one full bucket per refillIntervalMs, computed proportionally.
  const elapsed = now - state.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / refillIntervalMs) * capacity;
    state.tokens = Math.min(capacity, state.tokens + refill);
    state.lastRefill = now;
  }

  if (state.tokens < 1) return false;
  state.tokens -= 1;
  return true;
}

/**
 * Hono middleware factory. Drop on a route to enforce the bucket's rate.
 * Returns 429 with no body details on exhaustion.
 */
export function rateLimit(bucket: BucketKey) {
  const store = STORES[bucket];
  return createMiddleware(async (c, next) => {
    const ip = clientIp(c);
    if (!tryConsume(store, ip)) {
      return c.json({ error: 'rate_limited' }, 429);
    }
    await next();
  });
}
