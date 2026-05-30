import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type StampSize = "sm" | "md" | "lg";

export interface StampProps extends HTMLAttributes<HTMLSpanElement> {
  size?: StampSize;
}

const sizeClass: Record<StampSize, string> = {
  sm: "h-9 min-w-9 px-2 text-[10px]",
  md: "h-12 min-w-12 px-3 text-[11px]",
  lg: "h-16 min-w-16 px-4 text-[13px]",
};

export function Stamp({
  size = "md",
  className,
  children,
  style,
  ...rest
}: StampProps) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        "rounded-full font-mono uppercase tracking-[0.18em] leading-none",
        "text-accent-2 select-none whitespace-nowrap",
        sizeClass[size],
        className,
      )}
      style={{
        // Concentric hairline rings + inset paper-press shadow.
        boxShadow:
          "inset 0 0 0 1px rgba(232,207,153,0.45), inset 0 0 0 3px transparent, inset 0 0 0 4px rgba(232,207,153,0.18), inset 0 1px 2px rgba(0,0,0,0.35)",
        transform: "rotate(-4deg)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
