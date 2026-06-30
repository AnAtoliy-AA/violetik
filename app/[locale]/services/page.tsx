import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { listPublishedCategories } from "@/db/services";
import { loadServicesForLocale } from "@/entities/service/api/load";
import type { ServiceCategoryRef } from "@/entities/service";
import type { CurrencyCode } from "@/db/schema";
import { priceServices, cityForLocale } from "@/entities/site-settings";
import { ServicesCatalogPage } from "@/views/services-catalog";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { buildPageMetadata } from "@/shared/lib/page-metadata";
import { routing, type Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";

type Params = { locale: string };

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettingsServer();
  const city = cityForLocale(settings, locale as Locale);
  return buildPageMetadata({ locale, pageId: "services", path: "/services", city });
}

export default async function ServicesRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [settings, services, categoryRows, sessionUser] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale),
    listPublishedCategories(),
    getCurrentSessionUser(),
  ]);
  const categories: ServiceCategoryRef[] = categoryRows.map((c) => {
    const name =
      locale === "ru" ? c.nameRu : locale === "by" ? c.nameBy : c.nameEn;
    return { id: c.id, name };
  });
  const currency =
    ((settings as { currency?: CurrencyCode }).currency ?? "EUR");
  const pricedServices = priceServices(services, settings);
  return (
    <ServicesCatalogPage
      services={services}
      categories={categories}
      pricedServices={pricedServices}
      currency={currency}
      locale={locale}
      showAdmin={sessionUser?.role === "admin"}
    />
  );
}
