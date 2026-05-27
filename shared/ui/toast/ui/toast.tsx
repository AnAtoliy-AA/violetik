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
          className="text-text-3 hover:text-text transition-colors shrink-0 px-1 leading-none"
        >
          ×
        </button>
      </GlassSurface>
    </m.div>
  );
}
