import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ServiceCard } from "@/entities/service";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import type { NailTileVariant } from "@/shared/ui/nail-tile";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export async function SignaturesList() {
  const [t, localeStr, settings] = await Promise.all([
    getTranslations("Home"),
    getLocale(),
    getSiteSettingsServer(),
  ]);
  const locale = localeStr as Locale;
  const all = await loadServicesForLocale(locale);
  const services = all.slice(0, 4);
  const currency =
    ((settings as { currency?: CurrencyCode }).currency ?? "EUR");
  return (
    <section className="px-[22px] pb-6 pt-12">
      <div className="mb-3 flex items-end justify-between">
        <Plate folio number={1} label={t("plate_menu").toUpperCase()} />
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent"
        >
          {t("signatures_all_link")} <ArrowRight />
        </Link>
      </div>
      <h2 className="mt-1 font-display text-h2 font-normal italic leading-[1.05] tracking-[-0.02em]">
        {t("signatures_title")}
      </h2>
      <LetterpressRule className="mb-[22px] mt-3" />

      <div className="flex flex-col">
        {services.map((service, i) => (
          <SpotlightCard key={service.id} className="rounded-none">
            <Link
              href={`/services/${service.id}`}
              className="block transition-transform duration-fast ease-out hover:scale-[1.005] motion-reduce:hover:scale-100"
            >
              <ServiceCard
                service={service}
                variant={(i % 6) as NailTileVariant}
                topRule={i === 0}
                currency={currency}
                locale={locale}
              />
            </Link>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}
