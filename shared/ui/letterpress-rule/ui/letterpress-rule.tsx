import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type LetterpressRuleProps = HTMLAttributes<HTMLDivElement>;

export function LetterpressRule({
  className,
  style,
  ...rest
}: LetterpressRuleProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("h-px w-full", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-accent) 60%, transparent) 22%, var(--color-accent) 50%, color-mix(in oklab, var(--color-accent) 60%, transparent) 78%, transparent)",
        ...style,
      }}
      {...rest}
    />
  );
}
