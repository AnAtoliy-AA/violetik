"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildAuthUrl } from "@/shared/lib/google-calendar";

const CSRF_COOKIE = "gcal_oauth_state";
const CSRF_TTL_S = 600;

/**
 * Server action triggered from the admin "Connect Google Calendar"
 * button. Sets a short-lived CSRF cookie and redirects to Google's
 * consent screen. The callback at /api/integrations/google/callback
 * validates the cookie against the returned state param.
 */
export async function startGoogleOAuth(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Google OAuth env vars not configured");
  }
  const state = randomBytes(24).toString("base64url");
  const c = await cookies();
  c.set(CSRF_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_TTL_S,
  });
  redirect(buildAuthUrl({ clientId, redirectUri, state }));
}

export const GCAL_CSRF_COOKIE = CSRF_COOKIE;
