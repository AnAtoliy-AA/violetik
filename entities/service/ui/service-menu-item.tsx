import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import type { Service } from "@/entities/studio";

export interface ServiceMenuItemProps extends HTMLAttributes<HTMLElement> {
  service: Service;
  plateNumber: number;
  variant?: NailTileVariant;
  palette?: readonly [string, string];
  topRule?: boolean;
}

const DEFAULT_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function ServiceMenuItem({
  service,
  plateNumber,
  variant = 0,
  palette = DEFAULT_PALETTE,
  topRule = false,
  className,
  ...rest
}: ServiceMenuItemProps) {
  const padded = String(plateNumber).padStart(2, "0");
  return (
    <article
      className={cn(
        "group/menu border-b-[0.5px] border-line-strong py-[22px] transition-transform duration-fast ease-out",
        topRule && "border-t-[0.5px]",
        "hover:translate-x-1",
        className,
      )}
      {...rest}
    >
      <div className="flex items-start gap-4">
        <div className="h-[98px] w-[78px] shrink-0 overflow-hidden rounded-lg">
          <NailTile
            palette={palette}
            variant={variant}
            className="size-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-accent">
              {padded}
            </span>
            <span
              aria-hidden
              className="mb-1 h-0 flex-1 border-b-[0.5px] border-dotted border-line-strong"
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[28px] font-normal italic leading-[1.05] tracking-[-0.01em]">
              {service.name}
            </h3>
            <span className="shrink-0 font-mono text-[15px] text-gold">
              €{service.price}
            </span>
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
            {service.duration} · {service.category}
          </div>
          <p className="mt-2.5 text-[13px] leading-[1.5] text-text-2">
            {service.blurb}
          </p>
        </div>
      </div>
    </article>
  );
}
