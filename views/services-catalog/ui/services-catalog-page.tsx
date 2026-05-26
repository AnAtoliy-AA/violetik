"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServiceMenuItem } from "@/entities/service";
import type { Service, ServiceCategoryRef } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
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

const ALL: ChipValue = "All";

export interface ServicesCatalogPageProps {
  services: readonly Service[];
  categories: readonly ServiceCategoryRef[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
  locale?: Locale;
  showAdmin?: boolean;
  /** §11.3 — confirmed+completed booking counts per service id. */
  bookingCounts?: Readonly<Record<string, number>>;
}

export function ServicesCatalogPage({
  services,
  categories,
  pricedServices,
  currency = "EUR",
  locale = "en",
  showAdmin = false,
  bookingCounts,
}: ServicesCatalogPageProps) {
  const t = useTranslations("Services");
  const tHome = useTranslations("Home");
  const [active, setActive] = useState<ChipValue>(ALL);

  const chips: readonly ChipValue[] = useMemo(
    () => [ALL, ...categories.map((c) => c.id)],
    [categories],
  );
  const labels = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = { [ALL]: t("category_all") };
    for (const c of categories) out[c.id] = c.name;
    return out;
  }, [categories, t]);

  const filtered = useMemo(
    () =>
      active === ALL
        ? services
        : services.filter((s) => s.category.id === active),
    [active, services],
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
          <LetterpressRule className="mt-3.5 max-w-[440px]" />
          <p className="dropcap mt-4 max-w-[540px] text-[14px] text-text-2">
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
                  currency={currency}
                  locale={locale}
                  sittingsCount={bookingCounts?.[service.id] ?? 0}
                  sittingsLabel={
                    (bookingCounts?.[service.id] ?? 0) > 0
                      ? tHome("sittings_label", {
                          n: bookingCounts?.[service.id] ?? 0,
                        })
                      : undefined
                  }
                />
              </Link>
            </SpotlightCard>
          ))
        )}
      </div>
      <TabBar showAdmin={showAdmin} />
    </div>
  );
}
