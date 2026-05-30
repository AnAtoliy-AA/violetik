"use client";

import { useEffect, useRef } from "react";

export interface TelegramLoginProps {
  /** Bot username from @BotFather, without the leading @. */
  botUsername: string;
  /** Widget size. Defaults to "large". */
  size?: "large" | "medium" | "small";
  /**
   * Locale-aware path to the Telegram auth callback page (e.g.
   * `/en/auth/telegram`). Telegram redirects the browser here with the
   * signed payload appended as query params.
   */
  authPath: string;
  /** Where to send the user after a successful auth. */
  callbackUrl?: string;
}

/**
 * Renders the Telegram Login Widget in **redirect mode** (`data-auth-url`).
 *
 * We deliberately do NOT use callback mode (`data-onauth`): Telegram's
 * widget parses that attribute with `new Function(...)`, which is `eval`.
 * Our production CSP omits `'unsafe-eval'`, so callback mode throws
 * during widget init and the button never renders. Redirect mode builds
 * a plain closure instead — no eval, CSP stays tight.
 *
 * On success Telegram redirects to `authPath` (same origin) with the
 * payload as query params; the callback page forwards it to
 * `signIn("telegram", …)`, which runs the HMAC verification server-side
 * (see auth.ts). The widget script is loaded from telegram.org's CDN.
 */
export function TelegramLogin({
  botUsername,
  size = "large",
  authPath,
  callbackUrl = "/admin",
}: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.querySelector("script")) return;

    const authUrl = new URL(authPath, window.location.origin);
    authUrl.searchParams.set("callbackUrl", callbackUrl);

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-auth-url", authUrl.toString());
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
    };
  }, [botUsername, size, authPath, callbackUrl]);

  return <div ref={containerRef} className="flex justify-center" />;
}
