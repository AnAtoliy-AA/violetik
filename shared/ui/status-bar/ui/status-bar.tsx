import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface StatusBarProps extends HTMLAttributes<HTMLDivElement> {
  time?: string;
  label?: string;
  signal?: string;
}

export function StatusBar({
  time = "9:41",
  label = "VIOLETTA · OPEN",
  signal = "5G",
  className,
  ...rest
}: StatusBarProps) {
  return (
    <div
      role="presentation"
      className={cn(
        "flex h-11 shrink-0 items-center justify-between px-[22px] font-mono text-[11px] tracking-[0.05em] text-text-2",
        className,
      )}
      {...rest}
    >
      <span>{time}</span>
      <span className="inline-flex items-center gap-[10px]">
        <span
          aria-hidden
          className="inline-block size-[5px] rounded-full bg-accent animate-soft-pulse"
        />
        <span>{label}</span>
      </span>
      <span>{signal}</span>
    </div>
  );
}
