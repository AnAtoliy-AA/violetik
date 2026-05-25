"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
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
  return (
    <div
      role={toast.intent === "error" ? "alert" : "status"}
      className={cn(
        "gilded rounded-md shadow-card",
        "bg-surface/95 backdrop-blur-md text-text",
        "px-4 py-3 max-w-[min(360px,calc(100vw-32px))]",
        "flex items-start gap-3",
        className,
      )}
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
    </div>
  );
}
