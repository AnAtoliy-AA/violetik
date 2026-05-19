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
      className="inline-flex rounded-full border-[0.5px] border-line-strong bg-surface p-1"
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
            className={cn(
              "rounded-full border-0 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]",
              "transition-colors duration-fast ease-out",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              selected
                ? "bg-text text-bg"
                : "bg-transparent text-text-2 hover:text-text",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
