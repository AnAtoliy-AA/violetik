"use client";

import { cn } from "@/shared/lib/cn";

export type ChipValue = "All" | string;

export interface CategoryChipsProps {
  categories: readonly ChipValue[];
  active: ChipValue;
  onChange: (value: ChipValue) => void;
  labels: Record<string, string>;
  ariaLabel: string;
}

export function CategoryChips({
  categories,
  active,
  onChange,
  labels,
  ariaLabel,
}: CategoryChipsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="scroll-x flex gap-2 overflow-x-auto px-[22px] pb-1.5 pt-[18px]"
    >
      {categories.map((value) => {
        const selected = value === active;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(value)}
            className={cn(
              "shrink-0 rounded-full border-[0.5px] px-4 py-[9px] font-mono text-[11px] font-medium uppercase tracking-[0.16em]",
              "transition-colors duration-fast ease-out",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              selected
                ? "border-text bg-text text-bg"
                : "border-line-strong bg-transparent text-text-2 hover:text-text",
            )}
          >
            {labels[value] ?? value}
          </button>
        );
      })}
    </div>
  );
}
