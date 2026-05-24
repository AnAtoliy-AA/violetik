"use client";

import { cn } from "@/shared/lib/cn";

export type Billing = "monthly" | "annual";

export interface BillingToggleProps {
  value: Billing;
  onChange: (v: Billing) => void;
  monthlyLabel: string;
  annualLabel: string;
  ariaLabel: string;
}

const baseToggle =
  "rounded-full border-0 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const selectedToggle =
  "bg-gold text-bg bg-[length:200%_100%] bg-[position:0%_50%] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]";

const unselectedToggle = "bg-transparent text-text-2 hover:text-text";

export function BillingToggle({
  value,
  onChange,
  monthlyLabel,
  annualLabel,
  ariaLabel,
}: BillingToggleProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="gilded inline-flex rounded-full p-1"
    >
      {(
        [
          ["monthly", monthlyLabel],
          ["annual", annualLabel],
        ] as const
      ).map(([id, label]) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={cn(baseToggle, selected ? selectedToggle : unselectedToggle)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
