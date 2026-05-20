import { sql } from "drizzle-orm";
import { db, schema } from "./index";

export interface GoogleUserPayload {
  sub: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
}

/**
 * Inserts a new Google-authenticated user row or updates the existing
 * one (matched by `google_sub`). Idempotent — safe to call on every
 * sign-in. Bumps `last_sign_in_at` and refreshes profile fields.
 *
 * Returns null when the database isn't configured. Callers should
 * treat that as "skip persistence, keep going" — the JWT session
 * still works without the DB.
 */
export async function upsertGoogleUser(
  payload: GoogleUserPayload,
): Promise<schema.User | null> {
  if (!db) return null;

  const id = `google:${payload.sub}`;
  const now = new Date();

  const rows = await db
    .insert(schema.users)
    .values({
      id,
      googleSub: payload.sub,
      email: payload.email ?? null,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      photoUrl: payload.photoUrl ?? null,
      lastSignInAt: now,
    })
    .onConflictDoUpdate({
      target: schema.users.googleSub,
      set: {
        email: sql`EXCLUDED.email`,
        firstName: sql`EXCLUDED.first_name`,
        lastName: sql`EXCLUDED.last_name`,
        photoUrl: sql`EXCLUDED.photo_url`,
        lastSignInAt: now,
      },
    })
    .returning();

  return rows[0] ?? null;
}
