import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type HotSlotVariant = "last-one" | "popular" | "new";

export interface HotSlotProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: HotSlotVariant;
  label?: ReactNode;
}

const variantText: Record<HotSlotVariant, string> = {
  "last-one": "LAST ONE",
  popular: "POPULAR",
  new: "NEW",
};

const variantDot: Record<HotSlotVariant, string> = {
  "last-one": "bg-status-warn",
  popular: "bg-accent",
  new: "bg-status-open",
};

const srMessage: Record<HotSlotVariant, string> = {
  "last-one": "Only one slot remaining",
  popular: "Popular choice",
  new: "Recently added",
};

export function HotSlot({
  variant = "popular",
  label,
  className,
  ...rest
}: HotSlotProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "rounded-full border border-line-strong/40 bg-bg/60",
        "px-2 py-1 font-mono uppercase tracking-[0.2em] leading-none",
        "text-[10px] text-text-2 backdrop-blur-sm",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          variantDot[variant],
          "motion-safe:animate-soft-pulse",
        )}
      />
      <span aria-hidden>{label ?? variantText[variant]}</span>
      <span className="sr-only">{srMessage[variant]}</span>
    </span>
  );
}
