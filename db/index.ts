import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
type PgClient = ReturnType<typeof postgres>;

interface ClientPair {
  pg: PgClient;
  drizzle: DrizzleClient;
}

// In dev, cancel any query that hasn't settled within this window. The
// underlying cause is Next aborting the response mid-stream during HMR
// or SPA back-nav while a query is in flight; postgres-js never sees an
// abort signal, so the conn stays "checked out" until the server-side
// statement_timeout fires (Supabase default: 2 min). Pool exhaustion
// follows after a handful of those.
//
// 15s sits above legitimately-slow queries (typical SSR reads <5s,
// occasional cold-pool ones <15s) and well below the 30s threshold
// `withDevTimeout` uses to recycle the whole pool — so the per-query
// cancel almost always handles a stuck conn before the pool-recycle
// path is needed.
const QUERY_WATCHDOG_MS = 15_000;

/**
 * Dev-only fix for the postgres-js connection leak.
 *
 * Every drizzle query bottoms out in `pg.unsafe(query, params)`, which
 * returns a `PendingQuery`. That object is a Promise *and* exposes
 * `.cancel()` (see node_modules/postgres/types/index.d.ts), which sends
 * a PG cancel request on a side channel: the server aborts the
 * statement (SQLSTATE 57014), and the connection is released back to
 * the pool — even if the original consumer (the React Server Component
 * render) was aborted long ago.
 *
 * We monkey-patch `pg.unsafe` once at pool creation: each returned
 * PendingQuery gets a 15s watchdog. If the query hasn't settled by
 * then, we call `.cancel()`. The promise will reject with the cancel
 * error, but the conn is back. This is the only place we can install
 * the watchdog cheaply — drizzle does not expose AbortSignal threading
 * for its query builder, and Next.js Server Components don't expose
 * the request's AbortSignal at all.
 *
 * No-op in production: Vercel's function timeout already bounds
 * request duration, so a stuck query cannot accumulate.
 */
export function installQueryWatchdog(pg: PgClient): PgClient {
  if (process.env.NODE_ENV === "production") return pg;
  const originalUnsafe = pg.unsafe.bind(pg);
  // Cast: pg.unsafe is overloaded and rest-args don't capture all
  // overloads cleanly, but the runtime contract is unchanged — we pass
  // the same args through and return the same PendingQuery.
  pg.unsafe = function patchedUnsafe(...args: Parameters<typeof pg.unsafe>) {
    const pending = originalUnsafe(...(args as Parameters<typeof originalUnsafe>));
    const timer = setTimeout(() => {
      if (typeof pending.cancel === "function") {
        // Best-effort: cancel() may be a no-op if the query already
        // finished. The conn (if still held) is released after PG
        // acks the cancel request.
        pending.cancel();
      }
    }, QUERY_WATCHDOG_MS);
    pending.then(
      () => clearTimeout(timer),
      () => clearTimeout(timer),
    );
    return pending;
  } as typeof pg.unsafe;
  return pg;
}

/**
 * Drizzle client. Exported as a Proxy so the underlying postgres-js +
 * drizzle pair can be swapped without invalidating module-level
 * references in the ~16 db/*.ts callers. Property access (`db.select`,
 * `db.insert`, …) always dispatches to whatever the *current* pair is —
 * `resetDbClient()` swaps that pair in place when dev-mode detects a
 * poisoned pool. See `db/dev-timeout.ts`.
 *
 * Returns null when `DATABASE_URL` is unset so the codebase can
 * gracefully degrade in CI / local dev where the DB isn't provisioned.
 * Callers should null-check before use:
 *
 *   if (!db) return; // DB not configured, skip persistence
 *   await db.insert(schema.users)...
 *
 * `prepare: false` is required for the Supabase Transaction pooler
 * (port 6543) which doesn't support prepared statements.
 *
 * Cached on `globalThis` so Next.js dev-mode HMR reloads of this
 * module reuse the same postgres-js pool instead of orphaning the
 * old one. Without this, every file save would create a fresh pool;
 * the old pool's sockets stayed alive (held by the postgres-js
 * runtime + drizzle metadata), so after a few hours of dev work the
 * Supabase pooler's per-IP connection cap is exhausted and every
 * new query stalls. In prod each function instance is a fresh
 * process, so this cache is a no-op there.
 */
function createClientPair(): ClientPair | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    // `max: 1` only applies during the production build. Many SSG
    // workers building in parallel (× locales × routes) would otherwise
    // exceed Supabase PgBouncer's 200-conn cap and trip EMAXCONN
    // mid-build. At runtime / in dev the pool MUST be larger — with
    // only one connection, a single half-broken TCP socket (NAT
    // timeout, pooler-side idle close, HMR-orphaned cancel) hangs every
    // subsequent query for the 2-minute server-side statement_timeout,
    // since there's no second conn to retry on. Dev was previously
    // `max: 5` and that proved too tight: a few HMR-orphaned conns
    // (Next aborts the response mid-stream during SPA back-nav, and
    // postgres-js never reclaims the conn) would exhaust the pool and
    // make the next admin page wait 30s for the dev-timeout to fire.
    // `max: 20` gives enough headroom that a handful of leaked conns
    // don't starve real traffic; well below Supabase PgBouncer's cap.
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    const maxPool = isBuild ? 1 : 20;

    // Per-query statement_timeout cannot be enforced here: the Supabase
    // Transaction pooler (port 6543) silently ignores both
    // `connection.statement_timeout` and `?options=-c statement_timeout=...`;
    // the only knob that holds is the server-side `ALTER ROLE ... SET
    // statement_timeout` (currently 2min). A slow query will block the
    // page until Vercel's function timeout fires (~60s on hobby tier).
    const pg = postgres(url, {
      prepare: false,
      max: maxPool,
      // Fail fast on connect rather than holding a request open.
      connect_timeout: 10,
      // Recycle idle conns so the next request gets a fresh one —
      // important across HMR reloads in dev.
      idle_timeout: 20,
      // Recycle each pooled conn after 5 min regardless of activity,
      // so a long-running dev server can't accumulate stale sockets.
      max_lifetime: 60 * 5,
      // TCP keepalives every 30s. Keeps NAT / firewall entries alive
      // between bursty dev requests and lets the kernel surface
      // half-broken sockets as ECONNRESET within ~90s, so postgres-js
      // evicts them from the pool instead of feeding them to the next
      // query.
      keep_alive: 30,
    });
    installQueryWatchdog(pg);
    return { pg, drizzle: drizzle(pg, { schema }) };
  } catch (error) {
    // Malformed DATABASE_URL (e.g. a quoted value with a trailing comma
    // copied from a code snippet) shouldn't crash the build — fall back
    // to db=null and let callers degrade as if the DB were unconfigured.
    console.warn(
      "[db] DATABASE_URL is set but couldn't be parsed; persistence disabled:",
      error,
    );
    return null;
  }
}

const globalForDb = globalThis as unknown as {
  __violetikDbPair?: ClientPair | null;
};

if (globalForDb.__violetikDbPair === undefined) {
  globalForDb.__violetikDbPair = createClientPair();
}

function currentDrizzle(): DrizzleClient | null {
  return globalForDb.__violetikDbPair?.drizzle ?? null;
}

const proxyTarget = {} as DrizzleClient;

const dbProxy = new Proxy(proxyTarget, {
  get(_, prop, receiver) {
    const real = currentDrizzle();
    if (!real) return undefined;
    const value = Reflect.get(real, prop, receiver);
    // Bind methods so `this` inside drizzle's internals is the real
    // PostgresJsDatabase, not the Proxy. Non-function values (the few
    // public properties on the class) pass through unchanged.
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_, prop) {
    const real = currentDrizzle();
    return real ? Reflect.has(real, prop) : false;
  },
  // Without this, a destructuring assignment like `const { select } = db`
  // would silently no-op when DATABASE_URL is unset instead of throwing.
  ownKeys() {
    const real = currentDrizzle();
    return real ? Reflect.ownKeys(real) : [];
  },
  getOwnPropertyDescriptor(_, prop) {
    const real = currentDrizzle();
    return real ? Reflect.getOwnPropertyDescriptor(real, prop) : undefined;
  },
});

// Preserve the original `null when unconfigured` semantic for the ~78
// `if (!db) return` checks scattered across db/*.ts: when the initial
// createClientPair returned null, the export itself is null (truthy
// check fails), so callers short-circuit exactly as before. When the
// pool exists, the export is the Proxy whose target swaps on reset.
export const db: DrizzleClient | null = globalForDb.__violetikDbPair
  ? dbProxy
  : null;

// Seconds the old pool gets to drain after a reset. Healthy in-flight
// queries (sibling Suspense boundaries that happened to be running on
// the same pool when one query timed out) typically complete in under
// 1s; the timeout-triggered stuck queries that motivated the reset
// will of course not complete and get force-closed at the end of the
// window. Was previously `0` (immediate destroy), which collateral-
// damaged the healthy queries with "Failed query" errors.
const POOL_DRAIN_SECONDS = 5;

/**
 * Tear down the current postgres-js pool and create a fresh one on the
 * next access. Used by `withDevTimeout` when a query stalls long enough
 * to indicate the pool is poisoned (commonly: Next's mid-stream
 * response abort during HMR left in-flight queries holding connections
 * that postgres-js never reclaims). Without this reset, the *next*
 * request on the same dev-server session would just hit the same stuck
 * conns and time out again on a different query.
 *
 * The swap (`__violetikDbPair = createClientPair()`) is immediate — any
 * new query placed against `db` lands on the fresh pool. The old pool
 * is then drained: `.end({ timeout: POOL_DRAIN_SECONDS })` waits up to
 * 5s for in-flight queries to settle before force-closing. This avoids
 * "Failed query" errors in sibling Suspense boundaries whose healthy
 * queries happened to be running on the old pool when the timeout
 * fired — they get a chance to complete and resolve before the close.
 * Failures from `.end()` itself are swallowed: best-effort cleanup,
 * the new pool is what matters.
 */
export function resetDbClient(): void {
  const old = globalForDb.__violetikDbPair;
  globalForDb.__violetikDbPair = createClientPair();
  if (old) {
    void old.pg.end({ timeout: POOL_DRAIN_SECONDS }).catch(() => {});
  }
}

export { schema };
