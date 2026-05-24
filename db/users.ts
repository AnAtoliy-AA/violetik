import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

// SSR auth-path read budget — `getUserById` runs sequentially before
// any other admin/page query (via requireAdmin). If it hangs on a
// sick Supabase pooler, the whole page hangs. Same rationale as
// db/site-settings.ts.
const AUTH_READ_TIMEOUT_MS = 5_000;

export interface TelegramUserPayload {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
}

/**
 * Inserts a new user row or updates the existing one (matched by
 * telegram_id). Idempotent — safe to call on every sign-in. Bumps
 * last_sign_in_at and refreshes profile fields (the user may have
 * changed their Telegram name / avatar between sign-ins).
 *
 * Returns null when the database isn't configured (DATABASE_URL
 * unset). Callers should treat that as "skip persistence, keep
 * going" — the JWT session still works without the DB.
 */
export async function upsertTelegramUser(
  payload: TelegramUserPayload,
): Promise<schema.User | null> {
  if (!db) return null;

  const id = `tg:${payload.telegramId}`;
  const now = new Date();

  const rows = await db
    .insert(schema.users)
    .values({
      id,
      telegramId: payload.telegramId,
      username: payload.username ?? null,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      photoUrl: payload.photoUrl ?? null,
      lastSignInAt: now,
    })
    .onConflictDoUpdate({
      target: schema.users.telegramId,
      set: {
        username: sql`EXCLUDED.username`,
        firstName: sql`EXCLUDED.first_name`,
        lastName: sql`EXCLUDED.last_name`,
        photoUrl: sql`EXCLUDED.photo_url`,
        lastSignInAt: now,
      },
    })
    .returning();

  return rows[0] ?? null;
}

export async function getUserById(
  id: string,
): Promise<schema.User | null> {
  if (!db) return null;
  try {
    const rows = await withQueryTimeout(
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1),
      AUTH_READ_TIMEOUT_MS,
      "users.getById",
    );
    return rows[0] ?? null;
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/users] getUserById timed out:", error.message);
      return null;
    }
    throw error;
  }
}

/**
 * Persists the user's locale preference. The booking + notification
 * flows read this value to translate user-facing copy when no request
 * locale is available (background cron, server-initiated push).
 */
export async function setUserPreferredLocale(
  userId: string,
  locale: string,
): Promise<schema.User | null> {
  if (!db) return null;
  const rows = await db
    .update(schema.users)
    .set({ preferredLocale: locale })
    .where(eq(schema.users.id, userId))
    .returning();
  return rows[0] ?? null;
}
