"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import { MagneticButton } from "@/shared/ui/magnetic-button";
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
const SNAP_THRESHOLD = 0.25;
const SWIPE_VELOCITY = 400;

export function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => setWidth(containerRef.current?.offsetWidth ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const dragX = useMotionValue(0);
  const parallaxY = useTransform(dragX, [-200, 0, 200], [12, 0, -12]);

  const isLast = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
    setIndex(clamped);
  };

  const goNext = () => {
    if (!isLast) goTo(index + 1);
  };

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (width === 0) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (Math.abs(offset) > width * SNAP_THRESHOLD || Math.abs(velocity) > SWIPE_VELOCITY) {
      const direction = offset < 0 ? 1 : -1;
      goTo(index + direction);
    }
    dragX.set(0);
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
        ref={containerRef}
        aria-roledescription="carousel"
        aria-label={t("aria_carousel")}
        className="gilded glass-top relative h-[480px] overflow-hidden rounded-[28px]"
      >
        <motion.div
          className="flex h-full cursor-grab active:cursor-grabbing"
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.06}
          style={{ x: dragX }}
          animate={{ x: -index * width }}
          onDragEnd={handleDragEnd}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.7, ease: EASE_IN_OUT }
          }
        >
          {SLIDES.map((slide, i) => (
            <OnboardingSlide
              key={slide.id}
              palette={slide.palette}
              variant={slide.variant}
              active={i === index}
              parallaxY={reduceMotion ? undefined : parallaxY}
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
          {SLIDES.map((slide, i) => {
            const isActive = i === index;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={t("aria_dot", { n: i + 1, total: SLIDES.length })}
                onClick={() => goTo(i)}
                className={cn(
                  "relative h-1 rounded-full transition-[width] duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  isActive ? "w-[22px]" : "w-1.5 bg-line-strong",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="onboard-dot"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gold"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 360, damping: 28 }
                    }
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        {isLast ? (
          <MagneticButton>
            <Link
              href="/home"
              className={buttonClassName({ variant: "gold", size: "md" })}
            >
              {t("cta_begin")}
            </Link>
          </MagneticButton>
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
