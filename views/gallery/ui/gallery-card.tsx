"use client";

import { motion, useReducedMotion } from "motion/react";
import type { GalleryItem } from "@/entities/studio";
import { cn } from "@/shared/lib/cn";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";

export interface GalleryCardProps {
  item: GalleryItem;
  index: number;
  onOpen: (id: string) => void;
}

export function GalleryCard({ item, index, onOpen }: GalleryCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item.id)}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.52,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : index * 0.06,
      }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "relative w-full overflow-hidden rounded-[18px] border-[0.5px] border-line p-0",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
      style={{ height: item.h }}
      aria-label={item.tag}
    >
      <motion.div
        layoutId={`gallery-image-${item.id}`}
        className="size-full"
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <NailTile
          palette={item.palette}
          variant={((index + 1) % 6) as NailTileVariant}
          className="size-full"
        />
      </motion.div>
      <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(20,9,26,0.55)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text backdrop-blur-md">
        {item.tag}
      </span>
    </motion.button>
  );
}
