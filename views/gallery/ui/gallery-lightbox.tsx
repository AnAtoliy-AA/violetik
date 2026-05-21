"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import type { GalleryItem } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";

export interface GalleryLightboxProps {
  item: GalleryItem;
  setNumber: number;
  eyebrow: string;
  title: string;
  caption: string;
  closeLabel: string;
  onClose: () => void;
}

export function GalleryLightbox({
  item,
  setNumber,
  eyebrow,
  title,
  caption,
  closeLabel,
  onClose,
}: GalleryLightboxProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal
      aria-label={title}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(20,9,26,0.85)] p-[22px] backdrop-blur-[20px]"
    >
      <div
        className="relative w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          layoutId={`gallery-image-${item.id}`}
          className="gilded overflow-hidden rounded-[28px]"
          style={{ aspectRatio: "3 / 4" }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <NailTile
            palette={item.palette}
            variant={(setNumber % 6) as NailTileVariant}
            className="size-full"
          />
        </motion.div>
        <div className="mt-4 text-text">
          <Eyebrow gold>{eyebrow}</Eyebrow>
          <div className="my-2 mb-1.5 font-display text-[26px] font-normal italic">
            {title}
          </div>
          <LetterpressRule className="mb-2 max-w-[140px]" />
          <p className="m-0 text-[13px] text-text-2">{caption}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute -right-3.5 -top-3.5 inline-flex size-9 items-center justify-center rounded-full border-none bg-text text-bg"
        >
          ✕
        </button>
      </div>
    </motion.div>,
    document.body,
  );
}
