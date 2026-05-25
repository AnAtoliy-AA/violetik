import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Size = "xs" | "sm" | "md" | "lg";

export interface WordmarkProps extends HTMLAttributes<HTMLDivElement> {
  size?: Size;
  /**
   * When true, the brand name and subline render with the continuous gold
   * shimmer gradient. Respects prefers-reduced-motion (handled in globals.css).
   */
  animated?: boolean;
}

const sizeClass: Record<Size, string> = {
  xs: "text-2xl",
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl",
};

export function Wordmark({
  size = "md",
  animated = false,
  className,
  ...rest
}: WordmarkProps) {
  return (
    <div
      className={cn(
        "font-display italic leading-none",
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      <span className={cn("block", animated && "text-gold-shimmer")}>
        Violetta
      </span>
      <span
        className={cn(
          "block font-mono not-italic tracking-[0.32em] text-[0.22em] mt-2",
          animated ? "text-gold-shimmer" : "text-gold",
        )}
      >
        B·E·A·U·T·Y
      </span>
    </div>
  );
}
