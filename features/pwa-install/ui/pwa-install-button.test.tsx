import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { PwaInstallButton } from "./pwa-install-button";

const messages = {
  PwaInstall: {
    aria_label: "Install app",
    ios_instructions: "Tap Share, then Add to Home Screen.",
    ios_close: "Close",
  },
};

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PwaInstallButton />
    </NextIntlClientProvider>,
  );
}

type FakePromptEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function fireBeforeInstallPrompt(
  outcome: "accepted" | "dismissed" = "dismissed",
): FakePromptEvent {
  const evt = new Event("beforeinstallprompt") as FakePromptEvent;
  evt.prompt = vi.fn(async () => {});
  evt.userChoice = Promise.resolve({ outcome, platform: "web" });
  window.dispatchEvent(evt);
  return evt;
}

beforeEach(() => {
  // jsdom doesn't implement matchMedia; stub so the standalone check
  // returns false instead of throwing.
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  }
});

describe("PwaInstallButton", () => {
  it("renders nothing when neither installable nor on iOS", () => {
    renderButton();
    expect(
      screen.queryByRole("button", { name: /install app/i }),
    ).not.toBeInTheDocument();
  });

  it("renders once beforeinstallprompt has fired", () => {
    renderButton();
    act(() => {
      fireBeforeInstallPrompt();
    });
    expect(
      screen.getByRole("button", { name: /install app/i }),
    ).toBeInTheDocument();
  });

  it("invokes prompt() on click and hides after dismissal", async () => {
    renderButton();
    let evt!: FakePromptEvent;
    act(() => {
      evt = fireBeforeInstallPrompt("dismissed");
    });
    const btn = screen.getByRole("button", { name: /install app/i });
    await act(async () => {
      btn.click();
    });
    expect(evt.prompt).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: /install app/i }),
    ).not.toBeInTheDocument();
  });

  it("stays hidden once the appinstalled event fires", () => {
    renderButton();
    act(() => {
      fireBeforeInstallPrompt();
    });
    expect(
      screen.getByRole("button", { name: /install app/i }),
    ).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(
      screen.queryByRole("button", { name: /install app/i }),
    ).not.toBeInTheDocument();
  });
});
