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

const baseChip =
  "shrink-0 rounded-full px-4 py-[9px] font-mono text-[11px] font-medium uppercase tracking-[0.16em] transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const selectedChip =
  "bg-gold text-bg bg-[length:200%_100%] bg-[position:0%_50%] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25),0_2px_12px_-2px_rgba(201,169,110,0.3)] scale-[1.02]";

const unselectedChip = "gilded text-text-2 hover:text-text hover:scale-[1.01]";

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
            className={cn(baseChip, selected ? selectedChip : unselectedChip)}
          >
            {labels[value] ?? value}
          </button>
        );
      })}
    </div>
  );
}
