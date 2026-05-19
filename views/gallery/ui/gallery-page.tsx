"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { STUDIO_DATA, type GalleryTag } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { AppHeader } from "@/widgets/app-header";
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

export function GalleryPage() {
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

  const filtered = useMemo(
    () =>
      active === "All"
        ? STUDIO_DATA.gallery
        : STUDIO_DATA.gallery.filter((g) => g.tag === active),
    [active],
  );

  const openItem = openId
    ? (STUDIO_DATA.gallery.find((g) => g.id === openId) ?? null)
    : null;
  const setNumber = openItem
    ? STUDIO_DATA.gallery.findIndex((g) => g.id === openItem.id) + 1
    : 0;

  return (
    <div className="pb-10">
      <AppHeader back="/home" title={t("plate_title")} />

      <section className="px-[22px] pb-[18px]">
        <div className="flex justify-between border-b-[0.5px] border-line-strong pb-3.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
          <span>{t("plate_portfolio")}</span>
          <span className="text-accent">{t("plate_count")}</span>
        </div>
        <Eyebrow gold className="mt-6">
          {t("eyebrow")}
        </Eyebrow>
        <h1 className="mb-1.5 mt-2 font-display text-[56px] font-light italic leading-[0.95] tracking-[-0.025em]">
          {t("hero_title")}
        </h1>
        <p className="mt-3.5 max-w-[320px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
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
          <p className="py-12 text-center text-sm text-text-3">{t("empty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((item, index) => (
              <GalleryCard
                key={item.id}
                item={item}
                index={index}
                onOpen={setOpenId}
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
            eyebrow={t("lightbox_eyebrow", {
              number: setNumber.toString().padStart(2, "0"),
              tag: labels[openItem.tag] ?? openItem.tag,
            })}
            title={t("lightbox_title", {
              tag: labels[openItem.tag] ?? openItem.tag,
            })}
            caption={t("lightbox_caption", {
              tag: labels[openItem.tag] ?? openItem.tag,
            })}
            closeLabel={t("lightbox_close")}
            onClose={() => setOpenId(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
