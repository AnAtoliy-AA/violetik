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
    // The large folio numeral already carries the number, so the eyebrow
    // shows only the section name (no "PLATE NN" prefix).
    return (
      <div className={cn("flex items-end gap-3", className)} {...rest}>
        <span className="font-display text-[72px] italic leading-none tracking-[-0.04em] text-gold pb-[0.06em]">
          {padded}
        </span>
        {label ? <Eyebrow className="pb-2">{label}</Eyebrow> : null}
      </div>
    );
  }

  return (
    <Eyebrow className={cn(className)} {...rest}>
      {padded}
      {label ? ` · ${label}` : ""}
    </Eyebrow>
  );
}
