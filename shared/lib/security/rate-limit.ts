/**
 * In-memory fixed-window rate limiter. Mirrors the in-memory `slotCache`
 * pattern already used by the booking slots route — no external infra.
 *
 * Scope note: state lives in the module, so the window is per server
 * instance. At salon scale (single/low-concurrency instance) that is
 * sufficient. If the app is ever horizontally scaled, swap the store for
 * a shared backend (Upstash Redis / Vercel KV) behind this same API.
 */

export interface RateLimitOptions {
  /** Max requests permitted within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { ok: true };
}

/** Test-only: clear all counters between cases. */
export function __resetRateLimitStore(): void {
  store.clear();
}
