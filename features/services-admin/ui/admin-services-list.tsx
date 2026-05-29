"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLocalizedName } from "@/entities/service";
import type { Locale } from "@/i18n/routing";
import { SortableList } from "./sortable-list";
import type { Service, ServiceCategoryRow } from "@/db/schema";

export type ReorderAction = (
  ids: string[],
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface AdminServicesListProps {
  categories: readonly ServiceCategoryRow[];
  services: readonly Service[];
  /**
   * Published service ids that are hidden from the public menu because
   * they have no published master linked. Flagged with a badge.
   */
  hiddenServiceIds?: readonly string[];
  reorderCategoriesAction: ReorderAction;
  reorderServicesAction: ReorderAction;
}

interface CategoryItem {
  id: string;
  name: string;
  status: ServiceCategoryRow["status"];
  serviceCount: number;
}

interface ServiceItem {
  id: string;
  name: string;
  status: Service["status"];
  categoryId: string;
  priceCents: number;
  durationMinutes: number;
  hidden: boolean;
}

export function AdminServicesList({
  categories,
  services,
  hiddenServiceIds,
  reorderCategoriesAction,
  reorderServicesAction,
}: AdminServicesListProps) {
  const t = useTranslations("AdminServices");
  const locale = useLocale() as Locale;
  const [, startReorder] = useTransition();
  const hidden = new Set(hiddenServiceIds ?? []);

  const catItems: CategoryItem[] = categories.map((c) => ({
    id: c.id,
    name: pickLocalizedName(c, locale),
    status: c.status,
    serviceCount: services.filter(
      (s) => s.categoryId === c.id && s.status !== "archived",
    ).length,
  }));

  const svcItems: ServiceItem[] = services.map((s) => ({
    id: s.id,
    name: pickLocalizedName(s, locale),
    status: s.status,
    categoryId: s.categoryId,
    priceCents: s.priceCents,
    durationMinutes: s.durationMinutes,
    hidden: hidden.has(s.id),
  }));

  const categoryKey = catItems.map((c) => c.id).join("|");
  const serviceKey = svcItems.map((s) => s.id).join("|");

  return (
    <div className="flex flex-col gap-10 px-[22px] py-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {t("section_categories")}
          </h2>
          <Link
            href="/admin/services/categories/new"
            className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent"
          >
            {t("cta_new_category")}
          </Link>
        </div>
        <SortableList
          key={categoryKey}
          items={catItems}
          dragLabel={t("section_categories")}
          onReorder={(ids) => {
            startReorder(async () => {
              await reorderCategoriesAction(ids);
            });
          }}
          renderRow={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[18px] italic">{c.name}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  {t("service_count", { n: c.serviceCount })} ·{" "}
                  {c.status === "published"
                    ? t("status_published")
                    : c.status === "draft"
                      ? t("status_draft")
                      : t("status_archived")}
                </div>
              </div>
              <Link
                href={`/admin/services/categories/${c.id}`}
                className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent"
              >
                {t("cta_edit")}
              </Link>
            </div>
          )}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {t("section_services")}
          </h2>
          <Link
            href="/admin/services/new"
            className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent"
          >
            {t("cta_new_service")}
          </Link>
        </div>
        <SortableList
          key={serviceKey}
          items={svcItems}
          dragLabel={t("section_services")}
          onReorder={(ids) => {
            startReorder(async () => {
              await reorderServicesAction(ids);
            });
          }}
          renderRow={(s) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[18px] italic">{s.name}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  €{Math.round(s.priceCents / 100)} · {s.durationMinutes} min ·{" "}
                  {s.status === "published"
                    ? t("status_published")
                    : s.status === "draft"
                      ? t("status_draft")
                      : t("status_archived")}
                </div>
                {s.hidden ? (
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                    {t("badge_no_master")}
                  </div>
                ) : null}
              </div>
              <Link
                href={`/admin/services/${s.id}`}
                className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent"
              >
                {t("cta_edit")}
              </Link>
            </div>
          )}
        />
      </section>
    </div>
  );
}
