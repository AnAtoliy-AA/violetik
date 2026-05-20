import { db, schema } from "./index";

export interface SessionLike {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function splitName(full: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!full) return { firstName: null, lastName: null };
  const [first, ...rest] = full.split(" ");
  return {
    firstName: first || null,
    lastName: rest.join(" ") || null,
  };
}

/**
 * Safety net: ensures the row in `users` exists for the current
 * session id. The Auth.js signIn callback is supposed to do this,
 * but it swallows errors silently — if anything goes wrong (column
 * mismatch, RLS, etc.) the user can still sign in but the row is
 * missing, and every subsequent foreign-key check fails.
 *
 * Idempotent: ON CONFLICT (id) DO NOTHING. Returns true if a row
 * exists (or was just inserted), false if the DB isn't configured
 * or the id format is unknown.
 */
export async function ensureUserRow(session: SessionLike): Promise<boolean> {
  if (!db || !session.user?.id) return false;
  const userId = session.user.id;
  const { firstName, lastName } = splitName(session.user.name);
  const photoUrl = session.user.image ?? null;

  if (userId.startsWith("google:")) {
    const sub = userId.slice("google:".length);
    await db
      .insert(schema.users)
      .values({
        id: userId,
        googleSub: sub,
        email: session.user.email ?? null,
        firstName,
        lastName,
        photoUrl,
        lastSignInAt: new Date(),
      })
      .onConflictDoNothing({ target: schema.users.id });
    return true;
  }

  if (userId.startsWith("tg:")) {
    const telegramId = Number.parseInt(userId.slice("tg:".length), 10);
    if (!Number.isFinite(telegramId)) return false;
    await db
      .insert(schema.users)
      .values({
        id: userId,
        telegramId,
        firstName,
        lastName,
        photoUrl,
        lastSignInAt: new Date(),
      })
      .onConflictDoNothing({ target: schema.users.id });
    return true;
  }

  console.warn(
    "[ensureUserRow] unknown id format (no tg: / google: prefix):",
    userId,
  );
  return false;
}
