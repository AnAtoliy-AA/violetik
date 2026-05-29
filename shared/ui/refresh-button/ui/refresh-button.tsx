"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";

export interface RefreshButtonProps {
  /** Accessible label, e.g. translated "Refresh". */
  ariaLabel: string;
  /** Fired after the refresh has been kicked off. Used by polling wrappers to reset their baseline. */
  onRefresh?: () => void;
  /** Suppress the visibility-change auto-refresh (so a wrapper can own it). Default: false. */
  disableVisibilityRefresh?: boolean;
}

const circleClass = cn(
  "relative inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
  // Visible glyph stays 38px; a `before` pseudo extends the tap target to
  // ~46px so the button clears the 44px touch-target minimum on mobile.
  "before:absolute before:-inset-1 before:content-['']",
  "transition-colors duration-fast ease-out hover:bg-surface/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  "disabled:opacity-50",
);

function RefreshIcon({ spinning }: { spinning: boolean }) {
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
      className={spinning ? "animate-spin" : undefined}
    >
      <path d="M21 12a9 9 0 1 1-3.2-6.9" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function RefreshButton({
  ariaLabel,
  onRefresh,
  disableVisibilityRefresh = false,
}: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function trigger() {
    startTransition(() => {
      router.refresh();
    });
    onRefresh?.();
  }

  useEffect(() => {
    if (disableVisibilityRefresh) return;
    function onVisibility() {
      if (document.visibilityState === "visible") {
        startTransition(() => {
          router.refresh();
        });
        onRefresh?.();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [disableVisibilityRefresh, router, onRefresh]);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={trigger}
      disabled={isPending}
      className={circleClass}
    >
      <RefreshIcon spinning={isPending} />
    </button>
  );
}
