import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listPublishedCategories } from "@/db/services";
import { loadServicesForLocale } from "@/entities/service/api/load";
import type { ServiceCategoryRef } from "@/entities/service";
import type { CurrencyCode } from "@/db/schema";
import { ServicesCatalogPage } from "@/views/services-catalog";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
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
  const t = await getTranslations({ locale, namespace: "Services" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function ServicesRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [settings, services, categoryRows] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale),
    listPublishedCategories(),
  ]);
  const categories: ServiceCategoryRef[] = categoryRows.map((c) => {
    const name =
      locale === "ru" ? c.nameRu : locale === "by" ? c.nameBy : c.nameEn;
    return { id: c.id, name };
  });
  const currency =
    ((settings as { currency?: CurrencyCode }).currency ?? "EUR");
  return (
    <ServicesCatalogPage
      services={services}
      categories={categories}
      currency={currency}
      locale={locale}
    />
  );
}
