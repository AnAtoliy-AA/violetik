"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import type {
  GalleryCategoryView,
  GalleryItemView,
} from "@/entities/gallery";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { Plate } from "@/shared/ui/plate";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { GalleryCard } from "./gallery-card";
import { GalleryLightbox } from "./gallery-lightbox";
import { TagFilter, type TagFilterValue } from "./tag-filter";

export interface GalleryPageProps {
  /** Admin-managed filter categories, resolved for the active locale. */
  categories?: readonly GalleryCategoryView[];
  /** Admin-managed gallery pictures, resolved for the active locale. */
  items?: readonly GalleryItemView[];
  showAdmin?: boolean;
}

export function GalleryPage({
  categories = [],
  items = [],
  showAdmin = false,
}: GalleryPageProps = {}) {
  const t = useTranslations("Gallery");
  const [active, setActive] = useState<TagFilterValue>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  // §9.3 — tapping a palette dot filters the grid to other cards that
  // share that color. Null clears the filter.
  const [paletteFilter, setPaletteFilter] = useState<string | null>(null);

  const tags: readonly TagFilterValue[] = useMemo(
    () => ["All", ...categories.map((c) => c.id)],
    [categories],
  );

  const labels = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = { All: t("category_all") };
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [t, categories]);

  const filtered = useMemo(() => {
    const byCategory =
      active === "All" ? items : items.filter((g) => g.categoryId === active);
    if (!paletteFilter) return byCategory;
    return byCategory.filter((g) => {
      const dots = g.paletteDots ?? g.palette;
      return dots.includes(paletteFilter);
    });
  }, [active, items, paletteFilter]);

  const openIndex = openId ? items.findIndex((g) => g.id === openId) : -1;
  const openItem = openIndex >= 0 ? items[openIndex]! : null;
  const setNumber = openItem ? openIndex + 1 : 0;

  const navigateLightbox = (direction: 1 | -1) => {
    if (openIndex < 0 || items.length === 0) return;
    const next = items[(openIndex + direction + items.length) % items.length];
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
          <>
            {paletteFilter ? (
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
                <span>{t("palette_filter_eyebrow")}</span>
                <span
                  aria-hidden
                  className="size-3 rounded-full ring-[0.5px] ring-white/30"
                  style={{ background: paletteFilter }}
                />
                <button
                  type="button"
                  onClick={() => setPaletteFilter(null)}
                  className="ml-1 underline-offset-2 hover:text-text"
                >
                  {t("palette_filter_clear")}
                </button>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((item, index) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  index={index}
                  onOpen={setOpenId}
                  eager={index < 4}
                  onPaletteSelect={setPaletteFilter}
                  activePalette={paletteFilter}
                />
              ))}
            </div>
          </>
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
                tag: openItem.categoryName,
              }),
              // Admin-authored caption wins; otherwise fall back to the
              // category-derived auto title/caption (legacy behavior).
              title:
                openItem.caption ??
                t("lightbox_title", { tag: openItem.categoryName }),
              caption:
                openItem.caption ??
                t("lightbox_caption", { tag: openItem.categoryName }),
              closeLabel: t("lightbox_close"),
              shareLabel: t("lightbox_share_label"),
              shareSheetTitle: t("lightbox_share_sheet_title"),
              shareCopyLink: t("lightbox_share_copy_link"),
              shareTelegram: t("lightbox_share_telegram"),
              shareDownload: t("lightbox_share_download"),
              shareCopiedToast: t("lightbox_share_copied_toast"),
              shareNativeText: t("lightbox_share_native_text", {
                tag: openItem.categoryName,
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
