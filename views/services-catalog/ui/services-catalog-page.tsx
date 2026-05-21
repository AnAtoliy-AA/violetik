"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServiceMenuItem } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import { STUDIO_DATA, type Category } from "@/entities/studio";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { Aurora } from "@/shared/ui/aurora";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { Plate } from "@/shared/ui/plate";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { CategoryChips, type ChipValue } from "./category-chips";

const CATEGORIES: readonly Category[] = ["Care", "Gel", "Design", "Form"];

export interface ServicesCatalogPageProps {
  /**
   * Optional price map indexed by service id. Server route resolves
   * prices via site settings and passes them in. Missing entries fall
   * back to the catalog price — keeps tests/stories simple.
   */
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
}

export function ServicesCatalogPage({ pricedServices }: ServicesCatalogPageProps = {}) {
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

      <section className="relative overflow-hidden px-[22px] pb-[18px] pt-3">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <div className="relative z-10">
          <div className="flex items-end justify-between">
            <Plate folio number={0} label={t("plate_alacarte").toUpperCase()} />
            <span className="pb-2 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
              {t("plate_rituals")}
            </span>
          </div>
          <h1 className="mt-3 font-display text-h1 font-light italic leading-[0.95] tracking-[-0.025em]">
            {t("hero_title")}
          </h1>
          <LetterpressRule className="mt-3.5 max-w-[260px]" />
          <p className="dropcap mt-4 max-w-[320px] text-[14px] text-text-2">
            {t("hero_paragraph")}
          </p>
        </div>
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
          <div className="py-12 text-center">
            <Ornament className="mx-auto max-w-[160px]" />
            <p className="mt-6 font-display text-[18px] italic text-text-2">
              {t("empty")}
            </p>
          </div>
        ) : (
          filtered.map((service, i) => (
            <SpotlightCard key={service.id} className="rounded-none">
              <Link
                href={`/services/${service.id}`}
                className="block transition-transform duration-fast ease-out"
              >
                <ServiceMenuItem
                  service={service}
                  plateNumber={i + 1}
                  variant={(i % 6) as NailTileVariant}
                  topRule={i === 0}
                  resolvedPrice={pricedServices?.[service.id]}
                />
              </Link>
            </SpotlightCard>
          ))
        )}
      </div>
      <TabBar />
    </div>
  );
}
