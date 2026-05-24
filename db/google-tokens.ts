import { desc, eq } from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

const SSR_READ_TIMEOUT_MS = 5_000;

export interface GoogleTokenUpsert {
  userId: string;
  email: string;
  refreshToken: string;
  calendarId?: string;
  scope: string;
}

/**
 * Inserts a new google_oauth_tokens row or updates the existing one for
 * the same admin (PK = userId). Bumps connectedAt + lastRefreshAt to
 * now() because a fresh OAuth exchange just happened.
 *
 * Returns null when DATABASE_URL is unset — callers should treat that
 * as "persistence skipped" and surface a UI notice.
 */
export async function upsertGoogleToken(
  payload: GoogleTokenUpsert,
): Promise<schema.GoogleOauthToken | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .insert(schema.googleOauthTokens)
    .values({
      userId: payload.userId,
      email: payload.email,
      refreshToken: payload.refreshToken,
      calendarId: payload.calendarId ?? "primary",
      scope: payload.scope,
      lastRefreshAt: now,
    })
    .onConflictDoUpdate({
      target: schema.googleOauthTokens.userId,
      set: {
        email: payload.email,
        refreshToken: payload.refreshToken,
        calendarId: payload.calendarId ?? "primary",
        scope: payload.scope,
        connectedAt: now,
        lastRefreshAt: now,
      },
    })
    .returning();
  return rows[0] ?? null;
}

/**
 * Returns the most recently connected token row. v1 is single-admin so
 * this is effectively "the row"; the ORDER BY makes the choice
 * deterministic if a second admin ever connects.
 */
export async function getActiveGoogleToken(): Promise<schema.GoogleOauthToken | null> {
  if (!db) return null;
  try {
    const rows = await withQueryTimeout(
      db
        .select()
        .from(schema.googleOauthTokens)
        .orderBy(desc(schema.googleOauthTokens.connectedAt))
        .limit(1),
      SSR_READ_TIMEOUT_MS,
      "google_tokens.getActive",
    );
    return rows[0] ?? null;
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/google-tokens] getActiveGoogleToken timed out:",
        error.message,
      );
      return null;
    }
    throw error;
  }
}

export async function deleteGoogleToken(userId: string): Promise<void> {
  if (!db) return;
  await db
    .delete(schema.googleOauthTokens)
    .where(eq(schema.googleOauthTokens.userId, userId));
}

export async function updateLastRefresh(userId: string): Promise<void> {
  if (!db) return;
  await db
    .update(schema.googleOauthTokens)
    .set({ lastRefreshAt: new Date() })
    .where(eq(schema.googleOauthTokens.userId, userId));
}
