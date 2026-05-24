"use client";

import { cn } from "@/shared/lib/cn";

export type TagFilterValue = "All" | string;

export interface TagFilterProps {
  tags: readonly TagFilterValue[];
  active: TagFilterValue;
  onChange: (v: TagFilterValue) => void;
  labels: Record<string, string>;
  ariaLabel: string;
}

const baseChip =
  "shrink-0 rounded-full px-3.5 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const selectedChip =
  "bg-gold text-bg bg-[length:200%_100%] bg-[position:0%_50%] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]";

const unselectedChip = "gilded text-text-2 hover:text-text";

export function TagFilter({
  tags,
  active,
  onChange,
  labels,
  ariaLabel,
}: TagFilterProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="scroll-x flex gap-2 overflow-x-auto px-[22px] pb-3.5 pt-5"
    >
      {tags.map((tag) => {
        const selected = tag === active;
        return (
          <button
            key={tag}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tag)}
            className={cn(baseChip, selected ? selectedChip : unselectedChip)}
          >
            {labels[tag] ?? tag}
          </button>
        );
      })}
    </div>
  );
}
