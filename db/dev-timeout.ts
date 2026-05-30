import { resetDbClient } from "./index";

const IS_DEV = process.env.NODE_ENV !== "production";

export const DEV_QUERY_TIMEOUT_MS = 30_000;
// Extra grace given to the post-reset retry attempt before we give up
// entirely. Picked so the worst-case wait is `ms + RETRY_GRACE_MS`
// (40s default) — still under typical Vercel function timeouts in
// prod, well above the <1s a fresh-pool query actually needs.
const RETRY_GRACE_MS = 10_000;

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

// In-flight withDevTimeout instances register a retry callback here.
// When any one of them triggers a pool reset, every other one is told
// to retry on the fresh pool *immediately* instead of waiting for its
// own 30s timer to fire (which would just throw a redundant timeout
// error before our CONNECTION_DESTROYED retry path got a chance).
type RetryCallback = () => void;
const resetListeners = new Set<RetryCallback>();

function broadcastReset(): void {
  // Snapshot and clear: callbacks may re-register themselves if they
  // want to wait for another reset cycle (they currently don't).
  const fns = Array.from(resetListeners);
  resetListeners.clear();
  for (const fn of fns) {
    try {
      fn();
    } catch {
      // Listener errors are swallowed — they're independent retries,
      // and we don't want one bad listener to suppress the others.
    }
  }
}

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
  broadcastReset();
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
 * Dev-only safety net for SSR reads. Wraps a query factory so a stuck
 * postgres-js connection (commonly caused by Next's mid-stream response
 * abort when the user navigates away during HMR) doesn't stall the
 * Suspense boundary indefinitely.
 *
 * Three recovery paths layered together:
 *
 * 1. **CONNECTION_DESTROYED retry** — if the inner promise rejects with
 *    that postgres-js error code, we re-issue `factory()`. The conn was
 *    torn down before the query was written server-side, so retry is
 *    unconditionally safe. Triggers when a sibling withDevTimeout's
 *    reset destroys this query's connection mid-flight.
 *
 * 2. **Cross-instance reset broadcast** — every active withDevTimeout
 *    registers a listener on `resetListeners`. When any of them
 *    triggers a pool reset, all the others are told to retry on the
 *    fresh pool immediately, rather than waiting for their own 30s
 *    timer to expire and throw a redundant timeout error.
 *
 * 3. **Primary timer → retry → hard cap** — at `ms`, this instance
 *    triggers the pool reset (which broadcasts to siblings) and then
 *    issues its own retry on the fresh pool. A second hard timer at
 *    `ms + RETRY_GRACE_MS` is the final backstop: if even the retry
 *    on the fresh pool hangs, we throw `DevQueryTimeoutError` rather
 *    than waiting forever. Worst-case user wait: ~40s with default
 *    settings; happy-path post-recovery: ~31s (30s wait + sub-second
 *    retry).
 *
 * In production (NODE_ENV === "production") the helper is a no-op:
 * factory() called once, no race, no retry, no listener registration.
 * Vercel's function timeout bounds the request, and the pool-reset
 * mechanism is meaningless without HMR-induced response aborts.
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

    const cleanup = (): void => {
      clearTimeout(primaryTimer);
      clearTimeout(hardTimer);
      resetListeners.delete(triggerRetry);
    };

    const handle = (promise: Promise<T>): void => {
      promise.then(
        (value) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(value);
        },
        (error) => {
          if (settled) return;
          if (!retried && isConnectionDestroyedError(error)) {
            retried = true;
            // Pool was torn down (by us or a sibling). The `db` proxy
            // now points at the fresh pair, so factory() lands on the
            // new pool.
            handle(factory());
            return;
          }
          settled = true;
          cleanup();
          reject(error);
        },
      );
    };

    // Called both by the primary timer (this instance triggered the
    // reset) and by broadcastReset (a sibling instance triggered it).
    // Idempotent via the `retried` guard.
    const triggerRetry = (): void => {
      if (settled || retried) return;
      retried = true;
      handle(factory());
    };

    // Primary timer: at `ms`, fire the pool reset (which broadcasts
    // to all other listeners, including this one's triggerRetry) and
    // then ensure this instance also retries — broadcastReset clears
    // its listener set before iterating, but we call triggerRetry
    // explicitly here too in case our own listener was removed first.
    const primaryTimer = setTimeout(() => {
      if (settled) return;
      schedulePoolReset(label, ms);
      triggerRetry();
    }, ms);

    // Hard cap: if even the post-reset retry hangs (genuinely sick
    // pool, Supabase outage), give up at `ms + RETRY_GRACE_MS`.
    const hardTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DevQueryTimeoutError(label, ms + RETRY_GRACE_MS));
    }, ms + RETRY_GRACE_MS);

    resetListeners.add(triggerRetry);

    handle(factory());
  });
}
