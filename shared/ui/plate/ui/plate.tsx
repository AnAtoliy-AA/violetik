import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";

export interface PlateProps extends HTMLAttributes<HTMLSpanElement> {
  number: number;
  label?: string;
  folio?: boolean;
}

export function Plate({
  number,
  label,
  folio = false,
  className,
  ...rest
}: PlateProps) {
  const padded = number.toString().padStart(2, "0");

  if (folio) {
    return (
      <div className={cn("flex items-end gap-3", className)} {...rest}>
        <span className="font-display text-[72px] italic leading-[0.85] tracking-[-0.04em] text-gold">
          {padded}
        </span>
        <Eyebrow className="pb-2">
          PLATE {padded}
          {label ? ` · ${label}` : ""}
        </Eyebrow>
      </div>
    );
  }

  return (
    <Eyebrow className={cn(className)} {...rest}>
      PLATE {padded}
      {label ? ` · ${label}` : ""}
    </Eyebrow>
  );
}
