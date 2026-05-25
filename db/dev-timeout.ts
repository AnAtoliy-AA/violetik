import { resetDbClient } from "./index";

const IS_DEV = process.env.NODE_ENV !== "production";

export const DEV_QUERY_TIMEOUT_MS = 30_000;

export class DevQueryTimeoutError extends Error {
  readonly label: string;
  readonly ms: number;
  constructor(label: string, ms: number) {
    super(`Query "${label}" exceeded ${ms}ms dev-mode timeout`);
    this.name = "DevQueryTimeoutError";
    this.label = label;
    this.ms = ms;
  }
}

// Concurrent timeouts on the same poisoned pool would each schedule
// their own resetDbClient() call; the second+ would tear down a
// freshly-created pool. Coalesce per dev-server session.
let resetScheduled = false;

function schedulePoolReset(label: string, ms: number): void {
  if (resetScheduled) return;
  resetScheduled = true;
  console.warn(
    `[dev-timeout] ${label} stalled past ${ms}ms — recycling postgres pool. ` +
      `Common cause: Next aborted the response mid-stream while a query was ` +
      `in flight (e.g. you navigated away during SPA back-nav), and postgres-js ` +
      `never reclaimed the connection. Next request will run on a fresh pool.`,
  );
  resetDbClient();
  // Allow the next stall to trigger another reset (e.g. if the user
  // repeats the same pattern). Sit on the flag long enough to swallow
  // the burst of sibling-query rejections from the same Promise.all.
  setTimeout(() => {
    resetScheduled = false;
  }, 2_000);
}

/**
 * Dev-only safety net for SSR reads. Wraps a query promise in a 30s
 * race so a stuck postgres-js connection (commonly caused by Next's
 * mid-stream response abort when the user navigates away during HMR)
 * surfaces as a clear error in the terminal instead of stalling the
 * Suspense boundary until the kernel reaps the half-broken TCP socket
 * 4+ minutes later, AND triggers a pool reset so the *next* request
 * doesn't hit the same poisoned connections.
 *
 * In production the Vercel function timeout (60s–300s) already bounds
 * this — wrapping there would just add a second alarm clock and an
 * unnecessary pool tear-down — so this is a no-op when NODE_ENV is
 * production.
 *
 * The 30s threshold is chosen to sit above legitimately-slow queries
 * (typical SSR reads complete in <5s, occasional cold-pool ones in
 * <15s) and below the kernel-level TCP hang, so it only fires when
 * something is actually wrong.
 */
export function withDevTimeout<T>(
  promise: Promise<T>,
  label: string,
  ms: number = DEV_QUERY_TIMEOUT_MS,
): Promise<T> {
  if (!IS_DEV) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      schedulePoolReset(label, ms);
      reject(new DevQueryTimeoutError(label, ms));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
