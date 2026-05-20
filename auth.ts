import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { upsertTelegramUser } from "@/db/users";
import { upsertGoogleUser } from "@/db/google-users";

const ONE_DAY_SECONDS = 60 * 60 * 24;

/**
 * Verifies a Telegram Login Widget payload per:
 *   https://core.telegram.org/widgets/login#checking-authorization
 *
 * 1. data_check_string = all received fields except `hash`, joined as
 *    `key=value` lines and sorted alphabetically.
 * 2. secret_key = SHA-256 of the bot token.
 * 3. HMAC-SHA-256 of data_check_string with secret_key must equal `hash`.
 * 4. Reject auth payloads older than 24 h.
 */
function verifyTelegramAuth(
  data: Record<string, string | undefined>,
  botToken: string,
): boolean {
  if (!data.hash || typeof data.hash !== "string") return false;
  const { hash, ...rest } = data;

  const dataCheckString = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const expected = Buffer.from(computed, "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length) return false;
  if (!timingSafeEqual(expected, actual)) return false;

  const authDate = Number(rest.auth_date);
  if (!Number.isFinite(authDate)) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds < 0 || ageSeconds > ONE_DAY_SECONDS) return false;

  return true;
}

// In non-prod (local dev, CI) provide a fallback secret so the handlers
// don't 500 on missing AUTH_SECRET. Production still throws on startup
// if AUTH_SECRET isn't set — Auth.js handles that when `secret` is
// undefined.
const SECRET =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV !== "production"
    ? "dev-only-insecure-secret-do-not-ship"
    : undefined);

// Google provider is only included when its env vars are configured —
// keeps CI / local dev without OAuth secrets healthy.
const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: SECRET,
  providers: [
    Credentials({
      id: "telegram",
      name: "Telegram",
      credentials: {
        id: {},
        first_name: {},
        last_name: {},
        username: {},
        photo_url: {},
        auth_date: {},
        hash: {},
      },
      authorize: async (raw) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return null;
        const creds = raw as Record<string, string | undefined>;
        if (!verifyTelegramAuth(creds, botToken)) return null;

        const telegramId = Number(creds.id);
        if (!Number.isFinite(telegramId)) return null;

        const displayName =
          [creds.first_name, creds.last_name].filter(Boolean).join(" ") ||
          creds.username ||
          `tg:${telegramId}`;

        try {
          await upsertTelegramUser({
            telegramId,
            username: creds.username ?? null,
            firstName: creds.first_name ?? null,
            lastName: creds.last_name ?? null,
            photoUrl: creds.photo_url ?? null,
          });
        } catch (error) {
          console.error("[auth] upsertTelegramUser failed:", error);
        }

        return {
          id: `tg:${telegramId}`,
          name: displayName,
          image: typeof creds.photo_url === "string" ? creds.photo_url : null,
        };
      },
    }),
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Sign-in only — the calendar.events scope used by
            // /admin/integrations/google is a separate OAuth flow.
            authorization: { params: { scope: "openid email profile" } },
            // Don't override profile() — Auth.js v5 deliberately
            // overwrites the returned `id` with crypto.randomUUID()
            // for OAuth providers (see @auth/core/lib/actions/
            // callback/oauth/callback.js). We reconstruct the
            // "google:<sub>" id inside the jwt callback below where
            // `profile.sub` is still available.
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "google") return true;
      const sub = profile?.sub;
      if (!sub) return false;
      const [firstName, ...rest] = (profile.name ?? "").split(" ");
      try {
        await upsertGoogleUser({
          sub,
          email: profile.email ?? null,
          firstName: firstName || null,
          lastName: rest.join(" ") || null,
          photoUrl: typeof profile.picture === "string" ? profile.picture : null,
        });
      } catch (error) {
        // Don't silently swallow — future foreign-key failures on
        // bookings.user_id were impossible to debug because this
        // error was hidden. Log loudly. The booking submit has its
        // own ensureUserRow() safety net so missing rows still heal
        // on the next interaction.
        console.error(
          "[auth.signIn] upsertGoogleUser failed (user will be signed in but the users row is missing — ensureUserRow will retry on first booking):",
          error,
        );
      }
      return true;
    },
    jwt: ({ token, user, account, profile }) => {
      // First sign-in via Google: Auth.js has already replaced
      // user.id with a UUID, so reconstruct the prefixed id from
      // profile.sub (the original Google subject). For subsequent
      // requests `account` and `profile` are undefined and token.sub
      // is already correct from a previous run.
      if (account?.provider === "google" && profile?.sub) {
        token.sub = `google:${profile.sub}`;
      } else if (user?.id) {
        // Credentials provider (Telegram): authorize() returns the
        // already-prefixed "tg:<id>" and Auth.js preserves it on
        // user.id, so we can use it directly.
        token.sub = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  trustHost: true,
});

// Module-augment Session.user with the Telegram id we set on the JWT.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
