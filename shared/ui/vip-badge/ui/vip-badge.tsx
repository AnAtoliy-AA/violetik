import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type VipBadgeSize = "xs" | "sm";

export interface VipBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  size?: VipBadgeSize;
  label?: string;
}

const sizeClass: Record<VipBadgeSize, string> = {
  xs: "px-1.5 py-[1px] text-[9px] tracking-[0.18em]",
  sm: "px-2.5 py-1 text-[10px] tracking-[0.16em]",
};

export function VipBadge({
  size = "sm",
  label = "VIP",
  className,
  ...rest
}: VipBadgeProps) {
  return (
    <span
      aria-label={`${label} member`}
      className={cn(
        "gilded inline-flex items-center rounded-full font-mono uppercase text-accent leading-none",
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {label}
    </span>
  );
}
