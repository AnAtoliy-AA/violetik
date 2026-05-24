import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  gold?: boolean;
  active?: boolean;
}

export function Tag({ gold, active, className, children, ...rest }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono uppercase text-[11px] tracking-[0.16em]",
        "rounded-full px-3 py-1 border border-line text-text-2 leading-none",
        active && "bg-surface-2 text-text border-line-strong",
        gold && "text-gold",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
