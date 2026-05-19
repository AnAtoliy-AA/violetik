"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServiceMenuItem } from "@/entities/service";
import { STUDIO_DATA, type Category } from "@/entities/studio";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { CategoryChips, type ChipValue } from "./category-chips";

const CATEGORIES: readonly Category[] = ["Care", "Gel", "Design", "Form"];

export function ServicesCatalogPage() {
  const t = useTranslations("Services");
  const tCat = useTranslations("Services.category");
  const [active, setActive] = useState<ChipValue>("All");

  const chips: readonly ChipValue[] = useMemo(() => ["All", ...CATEGORIES], []);
  const labels = useMemo<Record<string, string>>(
    () => ({
      All: t("category_all"),
      Care: tCat("Care"),
      Gel: tCat("Gel"),
      Design: tCat("Design"),
      Form: tCat("Form"),
    }),
    [t, tCat],
  );

  const filtered = useMemo(
    () =>
      active === "All"
        ? STUDIO_DATA.services
        : STUDIO_DATA.services.filter((s) => s.category === active),
    [active],
  );

  return (
    <div className="pb-28">
      <AppHeader />

      <section className="px-[22px] pb-[18px]">
        <div className="flex justify-between border-b-[0.5px] border-line-strong pb-3.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
          <span>{t("plate_alacarte")}</span>
          <span className="text-accent">{t("plate_rituals")}</span>
        </div>
        <h1 className="mb-1.5 mt-6 font-display text-[56px] font-light italic leading-[0.95] tracking-[-0.025em]">
          {t("hero_title")}
        </h1>
        <p className="mt-3.5 max-w-[320px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      <CategoryChips
        categories={chips}
        active={active}
        onChange={setActive}
        labels={labels}
        ariaLabel={t("filter_aria")}
      />

      <div className="px-[22px] pb-7 pt-[22px]">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-3">
            {t("empty")}
          </p>
        ) : (
          filtered.map((service, i) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className="block transition-transform duration-fast ease-out"
            >
              <ServiceMenuItem
                service={service}
                plateNumber={i + 1}
                variant={(i % 6) as NailTileVariant}
                topRule={i === 0}
              />
            </Link>
          ))
        )}
      </div>
      <TabBar />
    </div>
  );
}
