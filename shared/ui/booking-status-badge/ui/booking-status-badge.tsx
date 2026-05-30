import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface BookingStatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement> {
  status: BookingStatus;
  /** Localized status word; caller supplies it (server holds the translator). */
  label: string;
}

// Dark, opaque pills (glass-readability rule): a dark scrim fill with a thin
// colored border + colored text. Tokens from app/globals.css @theme, exposed
// as Tailwind v4 utilities.
const TONE: Record<BookingStatus, string> = {
  pending: "border-status-warn/40 text-status-warn",
  confirmed: "border-status-open/40 text-status-open",
  cancelled: "border-rose/40 text-rose",
  completed: "border-line text-text-3",
};

/**
 * Small status pill shown on booking cards in the profile. Presentation
 * only — the caller passes the already-localized `label`.
 */
export function BookingStatusBadge({
  status,
  label,
  className,
  ...rest
}: BookingStatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center justify-center rounded-full border bg-scrim px-2 py-0.5",
        "font-mono text-[9px] uppercase leading-none tracking-[0.18em]",
        TONE[status],
        className,
      )}
      {...rest}
    >
      {label}
    </span>
  );
}
