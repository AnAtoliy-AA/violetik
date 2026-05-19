import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";

export interface PlateProps extends HTMLAttributes<HTMLSpanElement> {
  number: number;
  label?: string;
}

export function Plate({ number, label, className, ...rest }: PlateProps) {
  const padded = number.toString().padStart(2, "0");
  return (
    <Eyebrow className={cn(className)} {...rest}>
      PLATE {padded}
      {label ? ` · ${label}` : ""}
    </Eyebrow>
  );
}
