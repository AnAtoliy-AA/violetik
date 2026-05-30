import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { TelegramLogin } from "./telegram-login";

function getWidgetScript(container: HTMLElement): HTMLScriptElement | null {
  return container.querySelector("script[data-telegram-login]");
}

describe("TelegramLogin", () => {
  it("injects the Telegram widget script with the bot username", () => {
    const { container } = render(
      <TelegramLogin botUsername="Violetta_Beauty_Bot" authPath="/en/auth/telegram" />,
    );
    const script = getWidgetScript(container);
    expect(script).not.toBeNull();
    expect(script?.src).toContain("telegram.org/js/telegram-widget.js");
    expect(script?.getAttribute("data-telegram-login")).toBe(
      "Violetta_Beauty_Bot",
    );
  });

  it("uses redirect mode (data-auth-url) and NOT callback mode (data-onauth) to avoid the unsafe-eval CSP requirement", () => {
    const { container } = render(
      <TelegramLogin botUsername="Violetta_Beauty_Bot" authPath="/en/auth/telegram" />,
    );
    const script = getWidgetScript(container);
    expect(script?.hasAttribute("data-onauth")).toBe(false);
    expect(script?.hasAttribute("data-auth-url")).toBe(true);
  });

  it("points data-auth-url at the same-origin auth path carrying the callbackUrl", () => {
    const { container } = render(
      <TelegramLogin
        botUsername="Violetta_Beauty_Bot"
        authPath="/ru/auth/telegram"
        callbackUrl="/ru/profile"
      />,
    );
    const authUrl = new URL(
      getWidgetScript(container)!.getAttribute("data-auth-url")!,
    );
    expect(authUrl.origin).toBe(window.location.origin);
    expect(authUrl.pathname).toBe("/ru/auth/telegram");
    expect(authUrl.searchParams.get("callbackUrl")).toBe("/ru/profile");
  });

  it("does not inject the script twice on re-render", () => {
    const { container, rerender } = render(
      <TelegramLogin botUsername="Violetta_Beauty_Bot" authPath="/en/auth/telegram" />,
    );
    rerender(
      <TelegramLogin botUsername="Violetta_Beauty_Bot" authPath="/en/auth/telegram" />,
    );
    expect(container.querySelectorAll("script[data-telegram-login]")).toHaveLength(
      1,
    );
  });
});
