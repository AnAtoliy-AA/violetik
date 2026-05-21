import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

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
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows[0] ?? null;
}
