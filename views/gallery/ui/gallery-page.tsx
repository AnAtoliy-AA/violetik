"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import {
  STUDIO_DATA,
  type GalleryItem,
  type GalleryTag,
} from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { Plate } from "@/shared/ui/plate";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { GalleryCard } from "./gallery-card";
import { GalleryLightbox } from "./gallery-lightbox";
import { TagFilter, type TagFilterValue } from "./tag-filter";

const TAGS: readonly GalleryTag[] = [
  "Editorial",
  "Gel",
  "Chrome",
  "Lace",
  "Bridal",
];

export interface GalleryPageProps {
  /**
   * Optional gallery items with `image` populated from `studio_photos`.
   * When omitted, falls back to the in-memory STUDIO_DATA.gallery.
   */
  items?: readonly GalleryItem[];
  showAdmin?: boolean;
}

export function GalleryPage({
  items,
  showAdmin = false,
}: GalleryPageProps = {}) {
  const t = useTranslations("Gallery");
  const tCat = useTranslations("Gallery.category");
  const [active, setActive] = useState<TagFilterValue>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const tags: readonly TagFilterValue[] = useMemo(() => ["All", ...TAGS], []);

  const labels = useMemo<Record<string, string>>(
    () => ({
      All: t("category_all"),
      Editorial: tCat("Editorial"),
      Gel: tCat("Gel"),
      Chrome: tCat("Chrome"),
      Lace: tCat("Lace"),
      Bridal: tCat("Bridal"),
    }),
    [t, tCat],
  );

  const source = items ?? STUDIO_DATA.gallery;
  const filtered = useMemo(
    () =>
      active === "All"
        ? source
        : source.filter((g) => g.tag === active),
    [active, source],
  );

  const openItem = openId
    ? (STUDIO_DATA.gallery.find((g) => g.id === openId) ?? null)
    : null;
  const openIndex = openItem
    ? STUDIO_DATA.gallery.findIndex((g) => g.id === openItem.id)
    : -1;
  const setNumber = openItem ? openIndex + 1 : 0;

  const navigateLightbox = (direction: 1 | -1) => {
    if (openIndex < 0) return;
    const next = STUDIO_DATA.gallery[
      (openIndex + direction + STUDIO_DATA.gallery.length) %
        STUDIO_DATA.gallery.length
    ];
    if (next) setOpenId(next.id);
  };

  return (
    <div className="pb-28">
      <AppHeader back="/home" title={t("plate_title")} />

      <section className="relative overflow-hidden px-[22px] pb-[18px] pt-3">
        <PaperGrain />
        <div className="relative z-10">
          <div className="flex items-end justify-between">
            <Plate folio number={0} label={t("plate_portfolio").toUpperCase()} />
            <span className="pb-2 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
              {t("plate_count")}
            </span>
          </div>
          <h1 className="mt-3 font-display text-h1 font-light italic leading-[0.95] tracking-[-0.025em]">
            {t("hero_title")}
          </h1>
          <LetterpressRule className="mt-3.5 max-w-[440px]" />
          <p className="dropcap mt-4 max-w-[540px] text-[14px] text-text-2">
            {t("hero_paragraph")}
          </p>
        </div>
      </section>

      <TagFilter
        tags={tags}
        active={active}
        onChange={setActive}
        labels={labels}
        ariaLabel={t("filter_aria")}
      />

      <div className="px-[22px] pb-7 pt-[22px]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Ornament className="mx-auto max-w-[160px]" />
            <p className="mt-6 font-display text-[18px] italic text-text-2">
              {t("empty")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((item, index) => (
              <GalleryCard
                key={item.id}
                item={item}
                index={index}
                onOpen={setOpenId}
                eager={index < 4}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {openItem ? (
          <GalleryLightbox
            key={openItem.id}
            item={openItem}
            setNumber={setNumber}
            labels={{
              eyebrow: t("lightbox_eyebrow", {
                number: setNumber.toString().padStart(2, "0"),
                tag: labels[openItem.tag] ?? openItem.tag,
              }),
              title: t("lightbox_title", {
                tag: labels[openItem.tag] ?? openItem.tag,
              }),
              caption: t("lightbox_caption", {
                tag: labels[openItem.tag] ?? openItem.tag,
              }),
              closeLabel: t("lightbox_close"),
              shareLabel: t("lightbox_share_label"),
              shareSheetTitle: t("lightbox_share_sheet_title"),
              shareCopyLink: t("lightbox_share_copy_link"),
              shareTelegram: t("lightbox_share_telegram"),
              shareDownload: t("lightbox_share_download"),
              shareCopiedToast: t("lightbox_share_copied_toast"),
              shareNativeText: t("lightbox_share_native_text", {
                tag: labels[openItem.tag] ?? openItem.tag,
              }),
              nextLabel: t("lightbox_next"),
              prevLabel: t("lightbox_prev"),
            }}
            onClose={() => setOpenId(null)}
            onNavigate={navigateLightbox}
          />
        ) : null}
      </AnimatePresence>

      <TabBar showAdmin={showAdmin} />
    </div>
  );
}
