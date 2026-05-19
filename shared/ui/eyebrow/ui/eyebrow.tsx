import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  gold?: boolean;
}

export function Eyebrow({ gold, className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn(
        "font-mono uppercase text-[10px] tracking-[0.32em] text-text-2 leading-none",
        gold && "text-gold",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
