"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLocalizedName } from "@/entities/gallery";
import type { Locale } from "@/i18n/routing";
import { SortableList } from "./sortable-list";
import type { GalleryCategoryRow, GalleryItemRow } from "@/db/schema";

type Reorder = (
  ids: string[],
) => Promise<{ ok: true } | { ok: false; error: string }>;
type DeleteCategory = (
  id: string,
) => Promise<
  { ok: true } | { ok: false; error: string; blockingItemCount?: number }
>;
type DeleteItem = (
  id: string,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface AdminGalleryListProps {
  categories: readonly GalleryCategoryRow[];
  items: readonly GalleryItemRow[];
  reorderCategoriesAction: Reorder;
  reorderItemsAction: Reorder;
  deleteCategoryAction: DeleteCategory;
  deleteItemAction: DeleteItem;
}

export function AdminGalleryList({
  categories,
  items,
  reorderCategoriesAction,
  reorderItemsAction,
  deleteCategoryAction,
  deleteItemAction,
}: AdminGalleryListProps) {
  const t = useTranslations("AdminGallery");
  const locale = useLocale() as Locale;
  const [, startReorder] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const nameById = new Map(
    categories.map((c) => [c.id, pickLocalizedName(c, locale)]),
  );

  const catItems = categories.map((c) => ({
    id: c.id,
    name: pickLocalizedName(c, locale),
    itemCount: items.filter((i) => i.categoryId === c.id).length,
  }));

  const itemRows = items.map((i) => ({
    id: i.id,
    categoryName: nameById.get(i.categoryId) ?? i.categoryId,
    hasImage: Boolean(i.src),
    caption: i.captionEn ?? i.alt ?? "",
  }));

  const categoryKey = catItems.map((c) => c.id).join("|");
  const itemKey = itemRows.map((i) => i.id).join("|");

  return (
    <div className="flex flex-col gap-10 px-[22px] py-6">
      {notice ? (
        <p role="alert" className="rounded border-[0.5px] border-accent bg-surface-2 p-3 text-[13px] text-accent">
          {notice}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {t("section_categories")}
          </h2>
          <Link href="/admin/gallery/categories/new" className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
            {t("cta_new_category")}
          </Link>
        </div>
        <SortableList
          key={categoryKey}
          items={catItems}
          dragLabel={t("section_categories")}
          onReorder={(ids) => startReorder(async () => { await reorderCategoriesAction(ids); })}
          renderRow={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[18px] italic">{c.name}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  {t("item_count", { n: c.itemCount })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/gallery/categories/${c.id}`} className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
                  {t("cta_edit")}
                </Link>
                <button
                  type="button"
                  className="font-mono text-[12px] uppercase tracking-[0.16em] text-rose"
                  onClick={() => {
                    setNotice(null);
                    startReorder(async () => {
                      const r = await deleteCategoryAction(c.id);
                      if (!r.ok) {
                        setNotice(
                          r.error === "category_has_items"
                            ? t("delete_category_blocked", { n: r.blockingItemCount ?? 0 })
                            : t("delete_failed", { error: r.error }),
                        );
                      }
                    });
                  }}
                >
                  {t("cta_delete")}
                </button>
              </div>
            </div>
          )}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {t("section_items")}
          </h2>
          <Link href="/admin/gallery/new" className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
            {t("cta_new_item")}
          </Link>
        </div>
        <SortableList
          key={itemKey}
          items={itemRows}
          dragLabel={t("section_items")}
          onReorder={(ids) => startReorder(async () => { await reorderItemsAction(ids); })}
          renderRow={(i) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[18px] italic">{i.id}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  {i.categoryName} · {i.hasImage ? t("badge_has_image") : t("badge_no_image")}
                </div>
                {i.caption ? <div className="mt-1 text-[12px] text-text-2">{i.caption}</div> : null}
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/gallery/${i.id}`} className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
                  {t("cta_edit")}
                </Link>
                <button
                  type="button"
                  className="font-mono text-[12px] uppercase tracking-[0.16em] text-rose"
                  onClick={() => {
                    setNotice(null);
                    startReorder(async () => {
                      const r = await deleteItemAction(i.id);
                      if (!r.ok) setNotice(t("delete_failed", { error: r.error }));
                    });
                  }}
                >
                  {t("cta_delete")}
                </button>
              </div>
            </div>
          )}
        />
      </section>
    </div>
  );
}
