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

// postgres-js sets `code: 'CONNECTION_DESTROYED'` on errors thrown when
// a query is rejected because its underlying connection was torn down
// (our `pool.end()` after a timeout-triggered reset). Drizzle wraps the
// original error on `.cause`, so we walk both spots. `CONNECTION_ENDED`
// is the variant raised when the conn ended cleanly before the query
// began — same retry semantics, the query never executed.
function isConnectionDestroyedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidates = [error, (error as { cause?: unknown }).cause];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const code = (c as { code?: unknown }).code;
    if (code === "CONNECTION_DESTROYED" || code === "CONNECTION_ENDED") {
      return true;
    }
  }
  return false;
}

/**
 * Dev-only safety net for SSR reads. Wraps a query factory in a 30s
 * race so a stuck postgres-js connection (commonly caused by Next's
 * mid-stream response abort when the user navigates away during HMR)
 * surfaces as a clear error in the terminal instead of stalling the
 * Suspense boundary until the kernel reaps the half-broken TCP socket
 * 4+ minutes later, AND triggers a pool reset so the *next* request
 * doesn't hit the same poisoned connections.
 *
 * Takes a factory rather than a Promise so the helper can transparently
 * re-issue the query on the fresh pool when a sibling query's reset
 * destroyed this one's connection mid-flight. The `CONNECTION_DESTROYED`
 * postgres-js error specifically means the query never executed
 * server-side — so retry is safe even for the read paths we'd otherwise
 * never want to repeat.
 *
 * In production the Vercel function timeout (60s–300s) already bounds
 * this — wrapping there would just add a second alarm clock and an
 * unnecessary pool tear-down — so this is a no-op when NODE_ENV is
 * production (factory() called once, no race, no retry).
 *
 * The 30s threshold sits above legitimately-slow queries (typical SSR
 * reads complete in <5s, occasional cold-pool ones in <15s) and below
 * the kernel-level TCP hang, so it only fires when something is
 * actually wrong.
 */
export function withDevTimeout<T>(
  factory: () => Promise<T>,
  label: string,
  ms: number = DEV_QUERY_TIMEOUT_MS,
): Promise<T> {
  if (!IS_DEV) return factory();
  return new Promise<T>((resolve, reject) => {
    let retried = false;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      schedulePoolReset(label, ms);
      reject(new DevQueryTimeoutError(label, ms));
    }, ms);

    const handle = (promise: Promise<T>): void => {
      promise.then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          if (settled) return;
          if (!retried && isConnectionDestroyedError(error)) {
            retried = true;
            // Pool was just torn down (likely by another concurrent
            // withDevTimeout firing on the same poisoned pool). The
            // proxy in db/index.ts now points at the fresh pair, so
            // a fresh factory() runs on the new pool.
            handle(factory());
            return;
          }
          settled = true;
          clearTimeout(timer);
          reject(error);
        },
      );
    };

    handle(factory());
  });
}
