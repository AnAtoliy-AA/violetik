"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import { Wordmark } from "@/shared/ui/wordmark";
import type { NailTilePalette, NailTileVariant } from "@/shared/ui/nail-tile";
import { OnboardingSlide } from "./onboarding-slide";

interface SlideMeta {
  id: "atelier" | "ritual" | "membership";
  palette: NailTilePalette;
  variant: NailTileVariant;
}

const SLIDES: readonly SlideMeta[] = [
  { id: "atelier", palette: ["#c9a96e", "#7d3a6f"], variant: 1 },
  { id: "ritual", palette: ["#d9a3b6", "#3a2050"], variant: 2 },
  { id: "membership", palette: ["#9d7bc7", "#c9a96e"], variant: 3 },
];

const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (!isLast) setIndex(index + 1);
  };

  return (
    <div className="relative px-[22px]">
      <header className="flex items-center justify-between py-[6px] pb-6">
        <Wordmark size="xs" />
        <Link
          href="/home"
          className="font-mono text-xs uppercase tracking-[0.16em] text-text-3 hover:text-text-2"
        >
          {t("skip")}
        </Link>
      </header>

      <div
        aria-roledescription="carousel"
        aria-label={t("aria_carousel")}
        className="gilded glass-top relative h-[480px] overflow-hidden rounded-[28px]"
      >
        <motion.div
          className="flex h-full"
          animate={{ x: `${-index * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE_IN_OUT }}
        >
          {SLIDES.map((slide, i) => (
            <OnboardingSlide
              key={slide.id}
              palette={slide.palette}
              variant={slide.variant}
              active={i === index}
              eyebrow={t(`${slide.id}_eyebrow`)}
              title={t(`${slide.id}_title`)}
              body={t(`${slide.id}_body`)}
            />
          ))}
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div
          role="tablist"
          aria-label={t("aria_dots")}
          className="flex items-center gap-2"
        >
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t("aria_dot", { n: i + 1, total: SLIDES.length })}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                i === index ? "w-[22px] bg-gold" : "w-1.5 bg-line-strong",
              )}
            />
          ))}
        </div>
        {isLast ? (
          <Link
            href="/home"
            className={buttonClassName({ variant: "gold", size: "md" })}
          >
            {t("cta_begin")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className={buttonClassName({ variant: "gold", size: "md" })}
          >
            {t("cta_continue")}
          </button>
        )}
      </div>
    </div>
  );
}
