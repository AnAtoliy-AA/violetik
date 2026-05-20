import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

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
 */
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const client = postgres(url, { prepare: false });
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

export const db = createClient();
export { schema };
