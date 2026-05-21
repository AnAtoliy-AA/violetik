import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface MonogramSealProps extends HTMLAttributes<HTMLSpanElement> {
  letter: string;
}

export function MonogramSeal({
  letter,
  className,
  ...rest
}: MonogramSealProps) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full border border-accent/60",
        "font-display text-[14px] italic leading-none",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.3)]",
        className,
      )}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--color-accent-2) 70%, transparent), color-mix(in oklab, var(--color-accent) 35%, transparent) 65%, transparent)",
      }}
      {...rest}
    >
      <span className="text-gold">{letter}</span>
    </span>
  );
}
