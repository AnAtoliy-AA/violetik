"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { m, useReducedMotion, type PanInfo } from "motion/react";
import type { GalleryItem } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { Sheet } from "@/shared/ui/sheet";
import { useToast } from "@/shared/ui/toast";
import { PressableSurface } from "@/shared/ui/pressable-surface";

export interface GalleryLightboxLabels {
  eyebrow: string;
  title: string;
  caption: string;
  closeLabel: string;
  /** Optional share affordances; when absent, the share button is hidden. */
  shareLabel?: string;
  shareSheetTitle?: string;
  shareCopyLink?: string;
  shareTelegram?: string;
  shareDownload?: string;
  shareCopiedToast?: string;
  shareNativeText?: string;
  nextLabel?: string;
  prevLabel?: string;
}

export interface GalleryLightboxProps {
  item: GalleryItem;
  setNumber: number;
  labels: GalleryLightboxLabels;
  onClose: () => void;
  /** Optional callback to navigate forward/back; enables swipe nav. */
  onNavigate?: (direction: 1 | -1) => void;
}

const SWIPE_THRESHOLD_PX = 60;
const SWIPE_VELOCITY = 500;

export function GalleryLightbox({
  item,
  setNumber,
  labels,
  onClose,
  onNavigate,
}: GalleryLightboxProps) {
  const reduceMotion = useReducedMotion();
  const { push } = useToast();
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (onNavigate && (e.key === "ArrowRight" || e.key === "PageDown")) {
        onNavigate(1);
      }
      if (onNavigate && (e.key === "ArrowLeft" || e.key === "PageUp")) {
        onNavigate(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onNavigate]);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!onNavigate) return;
      const passesDistance = Math.abs(info.offset.x) > SWIPE_THRESHOLD_PX;
      const passesVelocity = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
      if (!passesDistance && !passesVelocity) return;
      onNavigate(info.offset.x < 0 ? 1 : -1);
    },
    [onNavigate],
  );

  const buildShareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("set", item.id);
    return url.toString();
  }, [item.id]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      if (labels.shareCopiedToast) {
        push({
          intent: "success",
          eyebrow: labels.shareLabel,
          body: labels.shareCopiedToast,
        });
      }
    } catch {
      /* clipboard denied — silently fail */
    }
    setShareOpen(false);
  }, [buildShareUrl, labels.shareCopiedToast, labels.shareLabel, push]);

  const onShareNative = useCallback(async () => {
    const shareData: ShareData = {
      title: labels.title,
      text: labels.shareNativeText ?? labels.title,
      url: buildShareUrl(),
    };
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user dismissed or unsupported — fall through to sheet */
      }
    }
    setShareOpen(true);
  }, [buildShareUrl, labels.shareNativeText, labels.title]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <m.div
      role="dialog"
      aria-modal
      aria-label={labels.title}
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
        <m.div
          layoutId={`gallery-image-${item.id}`}
          className="gilded overflow-hidden rounded-[28px]"
          style={{ aspectRatio: "3 / 4", touchAction: "pan-y" }}
          drag={onNavigate ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={onDragEnd}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <NailTile
            palette={item.palette}
            variant={(setNumber % 6) as NailTileVariant}
            image={item.image}
            imageSizes="(max-width: 420px) 100vw, 420px"
            className="size-full"
          />
        </m.div>
        <div className="mt-4 text-text">
          <Eyebrow gold>{labels.eyebrow}</Eyebrow>
          <div className="my-2 mb-1.5 font-display text-[26px] font-normal italic">
            {labels.title}
          </div>
          <LetterpressRule className="mb-2 max-w-[140px]" />
          <p className="m-0 text-[13px] text-text-2">{labels.caption}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.closeLabel}
          className="absolute -right-3.5 -top-3.5 inline-flex size-9 items-center justify-center rounded-full border-none bg-text text-bg"
        >
          ✕
        </button>
        {labels.shareLabel ? (
          <button
            type="button"
            onClick={onShareNative}
            aria-label={labels.shareLabel}
            className="absolute -bottom-3.5 -right-3.5 inline-flex size-9 items-center justify-center rounded-full border-none bg-accent text-bg shadow-card"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="12" r="2.4" />
              <circle cx="18" cy="6" r="2.4" />
              <circle cx="18" cy="18" r="2.4" />
              <path d="M8.2 10.8 15.8 7.2M8.2 13.2l7.6 3.6" />
            </svg>
          </button>
        ) : null}
      </div>
      {labels.shareLabel ? (
        <Sheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          snapPoints={[0.4]}
          title={labels.shareSheetTitle ?? labels.shareLabel}
        >
          <div className="mt-3 flex flex-col gap-2 pb-2">
            <PressableSurface
              onClick={onCopy}
              className="gilded rounded-md px-4 py-3 text-left"
            >
              <span className="font-mono uppercase tracking-[0.2em] text-xs text-text-2">
                {labels.shareCopyLink ?? "Copy link"}
              </span>
            </PressableSurface>
            <PressableSurface
              as="a"
              href={`https://t.me/share/url?url=${encodeURIComponent(buildShareUrl())}&text=${encodeURIComponent(labels.shareNativeText ?? labels.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="gilded rounded-md px-4 py-3 text-left no-underline"
              onClick={() => setShareOpen(false)}
            >
              <span className="font-mono uppercase tracking-[0.2em] text-xs text-text-2">
                {labels.shareTelegram ?? "Telegram"}
              </span>
            </PressableSurface>
            {item.image?.src ? (
              <a
                href={item.image.src}
                download={
                  item.image.src.split("/").pop() ?? "violetta.jpg"
                }
                className="gilded ripple-host inline-flex rounded-md px-4 py-3 text-left no-underline transition-transform duration-100 ease-out active:scale-[0.985] motion-reduce:active:scale-100"
                onClick={() => setShareOpen(false)}
              >
                <span className="font-mono uppercase tracking-[0.2em] text-xs text-text-2">
                  {labels.shareDownload ?? "Download"}
                </span>
              </a>
            ) : null}
          </div>
        </Sheet>
      ) : null}
    </m.div>,
    document.body,
  );
}
