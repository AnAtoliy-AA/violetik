"use client";

import type { HTMLAttributes } from "react";
import { m, useReducedMotion, type PanInfo } from "motion/react";
import { cn } from "@/shared/lib/cn";
import { GlassSurface } from "@/shared/ui/glass-surface";
import type { ToastInstance, ToastIntent } from "./toast-types";

const dotClass: Record<ToastIntent, string> = {
  info: "bg-accent",
  success: "bg-status-open",
  warn: "bg-status-warn",
  error: "bg-status-error",
};

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  toast: ToastInstance;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss, className, ...rest }: ToastProps) {
  const reduced = useReducedMotion();
  return (
    <m.div
      drag={reduced ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      className="w-fit"
      onDragEnd={(_, info: PanInfo) => {
        if (Math.abs(info.velocity.x) > 600 || Math.abs(info.offset.x) > 120) {
          onDismiss(toast.id);
        }
      }}
    >
      <GlassSurface
        tint="warm"
        blur="lg"
        rim
        elevation={2}
        className={cn(
          "rounded-md",
          "text-text px-4 py-3 max-w-[min(360px,calc(100vw-32px))]",
          "flex items-start gap-3",
          className,
        )}
        role={toast.intent === "error" ? "alert" : "status"}
        {...rest}
      >
        <span
          aria-hidden
          className={cn("mt-1.5 size-1.5 rounded-full shrink-0", dotClass[toast.intent])}
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {toast.eyebrow ? (
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-text-3">
              {toast.eyebrow}
            </span>
          ) : null}
          <span className="text-sm leading-snug">{toast.body}</span>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(toast.id)}
          className="-my-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </GlassSurface>
    </m.div>
  );
}
