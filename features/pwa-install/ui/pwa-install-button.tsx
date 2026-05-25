"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

// Chrome/Edge/Android fire `beforeinstallprompt` when the site is
// installable; we capture the event and trigger `prompt()` from a user
// click. iOS Safari never fires it — only fallback "Share → Add to
// Home Screen" works there, so we show an instruction dialog instead.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh; touch is the giveaway.
  const isIpad =
    /Macintosh/.test(ua) &&
    typeof document !== "undefined" &&
    "ontouchend" in document;
  return /iPhone|iPod|iPad/.test(ua) || isIpad;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  }
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function PwaInstallButton() {
  const t = useTranslations("PwaInstall");
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  // Browser-only detection (window.matchMedia, navigator.userAgent) has
  // to run after mount or SSR/CSR diverge. Same hydration-safe pattern
  // as features/theme-switcher; the rule is suppressed deliberately.
  useEffect(() => {
    if (detectStandalone()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInstalled(true);
      return;
    }
    setIsIos(detectIos());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      promptEventRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      promptEventRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onClick = useCallback(async () => {
    const event = promptEventRef.current;
    if (event) {
      await event.prompt();
      const choice = await event.userChoice;
      promptEventRef.current = null;
      setCanInstall(false);
      if (choice.outcome === "accepted") setIsInstalled(true);
      return;
    }
    if (isIos) setShowIosHelp(true);
  }, [isIos]);

  if (isInstalled) return null;
  if (!canInstall && !isIos) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("aria_label")}
        title={t("aria_label")}
        onClick={onClick}
        className={cn(
          "inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
          "transition-colors duration-fast ease-out hover:bg-surface/60",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        )}
      >
        <DownloadIcon />
      </button>
      {showIosHelp ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("aria_label")}
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 backdrop-blur-sm sm:items-center"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="m-4 max-w-sm rounded-lg border border-line-strong bg-bg p-6 text-text shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm leading-relaxed">{t("ios_instructions")}</p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 inline-flex items-center justify-center rounded-full border-[0.5px] border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-2 transition-colors duration-fast ease-out hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {t("ios_close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
