"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

/** Telegram login payload fields appended to the redirect URL. */
const TELEGRAM_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "username",
  "photo_url",
  "auth_date",
  "hash",
] as const;

export interface TelegramAuthCallbackProps {
  /** Where to send the user after a successful auth. */
  callbackUrl?: string;
}

/**
 * Handles the Telegram Login Widget **redirect-mode** return. Telegram
 * sends the browser to this page with the signed payload as query
 * params; we forward it to `signIn("telegram", …)` which runs the HMAC
 * verification server-side (see auth.ts). Using redirect mode instead of
 * callback mode keeps the CSP free of `'unsafe-eval'`.
 */
export function TelegramAuthCallback({
  callbackUrl = "/admin",
}: TelegramAuthCallbackProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("hash")) return;

    const payload: Record<string, string> = {};
    for (const field of TELEGRAM_FIELDS) {
      const value = params.get(field);
      if (value !== null) payload[field] = value;
    }

    void signIn("telegram", { ...payload, callbackUrl, redirect: true });
  }, [callbackUrl]);

  return null;
}
