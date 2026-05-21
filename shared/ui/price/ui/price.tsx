import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import type { ResolvedPrice } from "@/entities/site-settings";

export interface PriceProps extends HTMLAttributes<HTMLSpanElement> {
  resolved: ResolvedPrice;
  freeLabel?: string;
}

export function Price({
  resolved,
  freeLabel,
  className,
  ...rest
}: PriceProps) {
  if (resolved.effective === 0 && freeLabel) {
    return (
      <span className={className} {...rest}>
        {freeLabel}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5", className)}
      {...rest}
    >
      <span>€{resolved.effective}</span>
      {resolved.hasDiscount ? (
        <s className="font-mono text-[11px] text-text-3">€{resolved.base}</s>
      ) : null}
    </span>
  );
}
