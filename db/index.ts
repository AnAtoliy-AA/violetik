import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Drizzle client. Returns null when `DATABASE_URL` is unset so the
 * codebase can gracefully degrade in CI / local dev where the DB
 * isn't provisioned. Callers should null-check before use:
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
 * new query stalls until our 5s timeout. In prod each function
 * instance is a fresh process, so this cache is a no-op there.
 */
function createClient(): DrizzleClient | null {
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
    // since there's no second conn to retry on.
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    const maxPool = isBuild ? 1 : 5;

    // Per-query statement_timeout cannot be enforced here: the Supabase
    // Transaction pooler (port 6543) silently ignores both
    // `connection.statement_timeout` and `?options=-c statement_timeout=...`;
    // the only knob that holds is the server-side `ALTER ROLE ... SET
    // statement_timeout` (currently 2min). Hot-path callers wrap their
    // queries in `withQueryTimeout` (see ./with-query-timeout.ts) to
    // avoid blocking SSR that long.
    const client = postgres(url, {
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
    return drizzle(client, { schema });
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
  __violetikDb?: DrizzleClient | null;
};

if (globalForDb.__violetikDb === undefined) {
  globalForDb.__violetikDb = createClient();
}

export const db: DrizzleClient | null = globalForDb.__violetikDb;
export { schema };
