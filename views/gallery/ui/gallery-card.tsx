"use client";

import { m, useReducedMotion } from "motion/react";
import type { GalleryItem } from "@/entities/studio";
import { cn } from "@/shared/lib/cn";
import { useInView } from "@/shared/lib/use-in-view";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { Skeleton } from "@/shared/ui/skeleton";

export interface GalleryCardProps {
  item: GalleryItem;
  index: number;
  onOpen: (id: string) => void;
  /**
   * §9.4 — above-the-fold cards render eagerly so the LCP image is
   * available immediately. Below-the-fold cards defer until they
   * intersect the viewport so the initial paint stays cheap.
   */
  eager?: boolean;
}

export function GalleryCard({
  item,
  index,
  onOpen,
  eager = false,
}: GalleryCardProps) {
  const reduceMotion = useReducedMotion();
  const [observerRef, inView] = useInView<HTMLButtonElement>({
    rootMargin: "200px",
  });
  const shouldRenderImage = eager || inView;
  return (
    <m.button
      ref={observerRef}
      type="button"
      onClick={() => onOpen(item.id)}
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
        "gilded-lift spotlight relative w-full overflow-hidden rounded-[18px] p-0",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
      style={{ height: item.h }}
      aria-label={item.tag}
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
      <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(20,9,26,0.45)] px-2 py-[3px] font-display text-[12px] italic text-text backdrop-blur-md">
        Nº {String(index + 1).padStart(2, "0")}
      </span>
      <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(20,9,26,0.55)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text backdrop-blur-md">
        {item.tag}
      </span>
    </m.button>
  );
}
