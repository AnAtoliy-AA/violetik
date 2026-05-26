"use client";

import { motion, useReducedMotion, type MotionValue } from "motion/react";
import type { NailTilePalette, NailTileVariant } from "@/shared/ui/nail-tile";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailFan } from "@/shared/ui/nail-fan";
import { NailTile } from "@/shared/ui/nail-tile";
import { PaperGrain } from "@/shared/ui/paper-grain";

export interface OnboardingSlideProps {
  palette: NailTilePalette;
  variant: NailTileVariant;
  active: boolean;
  /** Drag-driven vertical parallax on the hero image. */
  parallaxY?: MotionValue<number>;
  eyebrow: string;
  title: string;
  body: string;
  /** Optional attribution (e.g. "— V.") rendered after the body. */
  attribution?: string;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function OnboardingSlide({
  palette,
  variant,
  active,
  parallaxY,
  eyebrow,
  title,
  body,
  attribution,
}: OnboardingSlideProps) {
  const reduceMotion = useReducedMotion();
  const fanPalette: NailTilePalette = [palette[0], "#14091a"];

  return (
    <div className="flex h-full w-full shrink-0 flex-col">
      <div className="relative h-[60%] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={parallaxY ? { y: parallaxY } : undefined}
          // §4 Ken-Burns slow zoom on the active hero (paused for reduced
          // motion). Inactive slides settle at 1.08 so the cross-fade reads
          // as one continuous lens move.
          animate={
            reduceMotion
              ? { scale: 1 }
              : active
                ? { scale: [1, 1.06, 1.06] }
                : { scale: 1.08 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : active
                ? { duration: 12, ease: "linear", times: [0, 0.5, 1] }
                : { duration: 0.7, ease: EASE_OUT }
          }
        >
          <NailTile palette={palette} variant={variant} className="size-full" />
        </motion.div>
        <PaperGrain className="opacity-[0.06]" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-[20%] -right-[10%] h-[60%] w-[70%]"
          initial={false}
          animate={{
            y: active || reduceMotion ? 0 : 40,
            rotate: -8,
            opacity: 0.92,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE_OUT }}
        >
          <NailFan palette={fanPalette} count={4} className="size-full" />
        </motion.div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 50%, color-mix(in oklab, var(--color-surface) 80%, transparent))",
          }}
        />
      </div>
      <div className="flex flex-1 flex-col justify-center bg-surface p-6">
        <Eyebrow gold>{eyebrow}</Eyebrow>
        <h2 className="mb-3 mt-2.5 font-display text-[36px] font-normal italic">
          {title}
        </h2>
        <LetterpressRule className="mb-3 max-w-[160px]" />
        {attribution ? (
          <blockquote className="m-0 font-display italic text-[17px] leading-[1.5] text-text-2">
            {body}
            <footer className="mt-2 font-mono not-italic text-[10px] uppercase tracking-[0.28em] text-text-3">
              {attribution}
            </footer>
          </blockquote>
        ) : (
          <p className="m-0 text-[15px] leading-[1.55] text-text-2">{body}</p>
        )}
      </div>
    </div>
  );
}
