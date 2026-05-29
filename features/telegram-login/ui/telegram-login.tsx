"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

export interface TelegramLoginProps {
  /** Bot username from @BotFather, without the leading @. */
  botUsername: string;
  /** Widget size. Defaults to "large". */
  size?: "large" | "medium" | "small";
  /** Where to send the user after a successful auth. */
  callbackUrl?: string;
}

/**
 * Renders the Telegram Login Widget. On successful auth Telegram calls
 * our global `onTelegramAuth` with the signed payload; we forward it to
 * NextAuth's `signIn("telegram", …)` which runs the HMAC verification
 * on the server (see auth.ts).
 *
 * The widget is loaded from telegram.org's CDN — we don't bundle it.
 */
export function TelegramLogin({
  botUsername,
  size = "large",
  callbackUrl = "/admin",
}: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = (user) => {
      const payload = Object.fromEntries(
        Object.entries(user).map(([k, v]) => [k, String(v)]),
      );
      void signIn("telegram", { ...payload, callbackUrl, redirect: true });
    };

    const container = containerRef.current;
    if (!container) return;
    if (container.querySelector("script")) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-radius", "20");
    container.appendChild(script);

    // The widget injects an <iframe> we don't render; give it an
    // accessible title (a11y: frames must be titled) once it appears.
    const observer = new MutationObserver(() => {
      const iframe = container.querySelector("iframe");
      if (iframe && !iframe.title) {
        iframe.title = "Telegram login";
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      delete window.onTelegramAuth;
    };
  }, [botUsername, size, callbackUrl]);

  return <div ref={containerRef} className="flex justify-center" />;
}
