"use client";

import { m, useReducedMotion } from "motion/react";
import type { GalleryItemView } from "@/entities/gallery";
import { cn } from "@/shared/lib/cn";
import { useInView } from "@/shared/lib/use-in-view";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { Skeleton } from "@/shared/ui/skeleton";

export interface GalleryCardProps {
  item: GalleryItemView;
  index: number;
  onOpen: (id: string) => void;
  /**
   * §9.4 — above-the-fold cards render eagerly so the LCP image is
   * available immediately. Below-the-fold cards defer until they
   * intersect the viewport so the initial paint stays cheap.
   */
  eager?: boolean;
  /** §9.3 — taps on a palette dot bubble up to filter the grid. */
  onPaletteSelect?: (color: string) => void;
  /** Currently-active palette filter — used to highlight the matching dot. */
  activePalette?: string | null;
}

export function GalleryCard({
  item,
  index,
  onOpen,
  eager = false,
  onPaletteSelect,
  activePalette,
}: GalleryCardProps) {
  const reduceMotion = useReducedMotion();
  const [observerRef, inView] = useInView<HTMLDivElement>({
    rootMargin: "200px",
  });
  const shouldRenderImage = eager || inView;
  return (
    // The card is a plain container; the open action is a stretched
    // <button> overlay (`.gc-open`) and the palette dots are sibling
    // <button>s — never nested inside another button. This keeps each
    // control a single, real, keyboard-reachable tab stop (avoids the
    // `nested-interactive` WCAG violation). The wrapper mirrors the
    // open-button's focus ring via `has-[.gc-open:focus-visible]`.
    <m.div
      ref={observerRef}
      onPointerMove={(event) => {
        const el = event.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${event.clientX - r.left}px`);
        el.style.setProperty("--my", `${event.clientY - r.top}px`);
      }}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.52,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : index * 0.06,
      }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "gilded-lift spotlight relative w-full overflow-hidden rounded-[18px]",
        "has-[.gc-open:focus-visible]:ring-1 has-[.gc-open:focus-visible]:ring-accent has-[.gc-open:focus-visible]:ring-offset-2 has-[.gc-open:focus-visible]:ring-offset-bg",
      )}
      style={{ height: item.h }}
    >
      <m.div
        layoutId={`gallery-image-${item.id}`}
        className="size-full"
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {shouldRenderImage ? (
          <NailTile
            palette={item.palette}
            variant={((index + 1) % 6) as NailTileVariant}
            image={item.image}
            imageSizes="(max-width: 420px) 50vw, 240px"
            className="size-full"
          />
        ) : (
          <Skeleton variant="rect" className="size-full rounded-none" />
        )}
      </m.div>

      {/* Primary action: open the lightbox. Stretched over the whole card. */}
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={item.categoryName}
        className="gc-open absolute inset-0 z-[1] focus:outline-none"
      />

      <span className="pointer-events-none absolute left-2.5 top-2.5 z-[2] rounded-full bg-[rgba(20,9,26,0.45)] px-2 py-[3px] font-display text-[12px] italic text-text backdrop-blur-md">
        Nº {String(index + 1).padStart(2, "0")}
      </span>
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-[2] rounded-full bg-[rgba(20,9,26,0.55)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text backdrop-blur-md">
        {item.categoryName}
      </span>
      {/* §9.3 — palette dots, real sibling buttons in a glass capsule at
        * bottom-right. Tapping a dot filters the grid to other cards
        * sharing that color. Falls back to the two `palette` colors when
        * no extended `paletteDots` is provided. */}
      <span className="absolute bottom-2.5 right-2.5 z-[2] inline-flex items-center gap-1.5 rounded-full bg-[rgba(20,9,26,0.55)] px-2 py-1.5 backdrop-blur-md">
        {(item.paletteDots ?? item.palette).slice(0, 4).map((color, i) => {
          const isActive = activePalette === color;
          return (
            <button
              type="button"
              key={`${color}-${i}`}
              aria-label={color}
              aria-pressed={isActive}
              onClick={() => onPaletteSelect?.(color)}
              className={cn(
                // The visible swatch stays a small 10px dot to fit the
                // capsule, but a `before` pseudo extends the tap area ~8px
                // in every direction so the dots aren't pixel-perfect targets.
                "relative size-2.5 rounded-full ring-[0.5px] ring-white/30 transition-transform",
                "before:absolute before:-inset-1 before:content-['']",
                "hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                isActive && "scale-125 ring-1 ring-accent",
              )}
              style={{ background: color }}
            />
          );
        })}
      </span>
    </m.div>
  );
}
