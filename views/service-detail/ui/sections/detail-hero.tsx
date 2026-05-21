"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { Service } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { Plate } from "@/shared/ui/plate";
import { Price } from "@/shared/ui/price";

export interface DetailHeroProps {
  service: Service;
  plateNumber: number;
  variant: NailTileVariant;
  palette: readonly [string, string];
  durationLabel: string;
  resolvedPrice?: ResolvedPrice;
}

export function DetailHero({
  service,
  plateNumber,
  variant,
  palette,
  durationLabel,
  resolvedPrice,
}: DetailHeroProps) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const heroY = useTransform(scrollY, [0, 500], [0, -225]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.2]);

  const heroStyle = reduceMotion ? undefined : { y: heroY, scale: heroScale };

  return (
    <div className="relative h-[440px] overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={heroStyle}
        aria-hidden
      >
        <NailTile palette={palette} variant={variant} className="size-full" />
      </motion.div>

      <PaperGrain className="opacity-[0.05]" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--color-bg) 40%, transparent) 0%, transparent 30%, var(--color-bg) 100%)",
        }}
      />

      <div className="absolute inset-x-[22px] bottom-[22px]">
        <Plate folio number={plateNumber} label={service.category.toUpperCase()} />
        <h1 className="mt-3 font-display text-[56px] font-light italic leading-[0.95] tracking-[-0.025em]">
          {service.name}.
        </h1>
        <LetterpressRule className="mt-3.5" />
        <div className="mt-3.5 flex items-baseline justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
            {durationLabel}
          </span>
          <span className="gilded inline-flex items-center rounded-full px-3 py-1">
            <span className="font-display text-[20px] italic leading-none text-gold-shimmer">
              {resolvedPrice ? (
                <Price resolved={resolvedPrice} />
              ) : (
                <>€{service.price}</>
              )}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
