"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/entities/onboarding";
import type { Locale } from "@/i18n/routing";
import { SortableList } from "./sortable-list";
import type { OnboardingSlideRow } from "@/db/schema";

type Reorder = (
  ids: string[],
) => Promise<{ ok: true } | { ok: false; error: string }>;
type DeleteSlide = (
  id: string,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface AdminOnboardingListProps {
  slides: readonly OnboardingSlideRow[];
  reorderSlidesAction: Reorder;
  deleteSlideAction: DeleteSlide;
}

export function AdminOnboardingList({
  slides,
  reorderSlidesAction,
  deleteSlideAction,
}: AdminOnboardingListProps) {
  const t = useTranslations("AdminOnboarding");
  const locale = useLocale() as Locale;
  const [, startReorder] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const rows = slides.map((s) => ({
    id: s.id,
    title: pickLocale({ en: s.titleEn, ru: s.titleRu, by: s.titleBy }, locale),
    hasImage: Boolean(s.src),
  }));
  const key = rows.map((r) => r.id).join("|");

  return (
    <div className="flex flex-col gap-6 px-[22px] py-6">
      {notice ? (
        <p role="alert" className="rounded border-[0.5px] border-accent bg-surface-2 p-3 text-[13px] text-accent">
          {notice}
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_slides")}
        </h2>
        <Link href="/admin/onboarding/new" className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
          {t("cta_new_slide")}
        </Link>
      </div>
      <SortableList
        key={key}
        items={rows}
        dragLabel={t("section_slides")}
        onReorder={(ids) => startReorder(async () => { await reorderSlidesAction(ids); })}
        renderRow={(s) => (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-[18px] italic">{s.title || s.id}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                {s.id} · {s.hasImage ? t("badge_has_image") : t("badge_no_image")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/onboarding/${s.id}`} className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
                {t("cta_edit")}
              </Link>
              <button
                type="button"
                className="font-mono text-[12px] uppercase tracking-[0.16em] text-rose"
                onClick={() => {
                  setNotice(null);
                  startReorder(async () => {
                    const r = await deleteSlideAction(s.id);
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
    </div>
  );
}
