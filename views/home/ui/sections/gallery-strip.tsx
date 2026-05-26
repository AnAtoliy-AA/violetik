"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const CARD_LIFT = { y: -4, scale: 1.02 } as const;
const CARD_TRANSITION = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export function GalleryStrip() {
  const t = useTranslations("Home");
  const items = STUDIO_DATA.gallery.slice(0, 5);
  const reduceMotion = useReducedMotion();

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const measure = () => {
      const viewport = viewportRef.current?.offsetWidth ?? 0;
      const track = trackRef.current?.scrollWidth ?? 0;
      // Account for the 22px right gutter so the last card lines up with the
      // text columns above it instead of slamming into the page edge.
      setMaxDrag(Math.max(0, track - viewport + 22));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [reduceMotion]);

  return (
    <section className="pb-7 pt-5">
      <div className="mb-3 flex items-end justify-between px-[22px]">
        <div>
          <Plate folio number={4} label={t("plate_portfolio").toUpperCase()} />
          <h2 className="mt-2 font-display text-h2 font-normal italic leading-[1.05] tracking-[-0.02em]">
            {t("gallery_title_a")} <em>{t("gallery_title_b")}</em>.
          </h2>
        </div>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent"
        >
          {t("gallery_view_all")} <ArrowRight />
        </Link>
      </div>
      <LetterpressRule className="mx-[22px] mb-4" />
      <div ref={viewportRef} className="overflow-hidden">
        <m.div
          ref={trackRef}
          drag={reduceMotion || maxDrag === 0 ? false : "x"}
          dragConstraints={{ left: -maxDrag, right: 0 }}
          dragElastic={0.08}
          dragTransition={{ bounceStiffness: 200, bounceDamping: 28 }}
          className="flex gap-3 px-[22px] pb-2 cursor-grab active:cursor-grabbing select-none"
        >
          {items.map((g, i) => (
            <m.div
              key={g.id}
              whileHover={reduceMotion ? undefined : CARD_LIFT}
              transition={CARD_TRANSITION}
              className="shrink-0"
            >
              <Link
                href="/gallery"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className="gilded-lift relative block h-[220px] w-[150px] overflow-hidden rounded-[18px] shadow-card"
              >
                <NailTile
                  palette={g.palette}
                  variant={((i + 1) % 6) as NailTileVariant}
                  className="size-full"
                />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(20,9,26,0.45)] px-2 py-[3px] font-display text-[12px] italic text-text backdrop-blur-md">
                  Nº {String(i + 1).padStart(2, "0")}
                </span>
                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(20,9,26,0.55)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text backdrop-blur-md">
                  {g.tag}
                </span>
              </Link>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
