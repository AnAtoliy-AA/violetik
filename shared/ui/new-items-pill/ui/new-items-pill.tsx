"use client";

import { cn } from "@/shared/lib/cn";

export interface NewItemsPillProps {
  count: number;
  label: string;
  onClick: () => void;
}

export function NewItemsPill({ count, label, onClick }: NewItemsPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid="new-items-pill"
      data-count={count}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1",
        "border border-accent/40 bg-accent/15 text-accent",
        "font-mono text-[10px] uppercase tracking-[0.18em]",
        "transition-colors hover:bg-accent/25",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
    >
      {label}
    </button>
  );
}
