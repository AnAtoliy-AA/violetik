import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCode } from "@/shared/lib/google-calendar";
import { upsertGoogleToken } from "@/db/google-tokens";
import { GCAL_CSRF_COOKIE } from "@/features/google-calendar-connect/api/constants";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(req, GCAL_CSRF_COOKIE);

  if (
    !code ||
    !state ||
    !cookieState ||
    !timingSafeStringEqual(state, cookieState)
  ) {
    return new Response("invalid_state", { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthenticated", { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return new Response("not_configured", { status: 500 });
  }

  try {
    const tokens = await exchangeCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    const userinfoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    const userinfo = userinfoRes.ok
      ? ((await userinfoRes.json()) as { email?: string })
      : {};
    await upsertGoogleToken({
      userId: session.user.id,
      email: userinfo.email ?? "unknown",
      refreshToken: tokens.refreshToken,
      scope: tokens.scope,
    });
    const dest = new URL(
      "/admin/integrations/google?status=connected",
      url.origin,
    );
    const res = NextResponse.redirect(dest);
    res.cookies.delete(GCAL_CSRF_COOKIE);
    return res;
  } catch (err) {
    console.error("[gcal callback]", err);
    const dest = new URL(
      "/admin/integrations/google?error=exchange",
      url.origin,
    );
    return NextResponse.redirect(dest);
  }
}
