import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice } from "@/entities/site-settings";
import {
  loadPublishedServiceIds,
  loadServiceByIdForLocale,
} from "@/entities/service/api/load";
import type { CurrencyCode } from "@/db/schema";
import { routing, type Locale } from "@/i18n/routing";
import { ServiceDetailPage } from "@/views/service-detail";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; id: string };

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export async function generateStaticParams() {
  const ids = await loadPublishedServiceIds();
  return routing.locales.flatMap((locale) =>
    ids.map((id) => ({ locale, id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return { title: "Violetta" };
  const service = await loadServiceByIdForLocale(id, locale);
  if (!service) return { title: "Violetta" };
  const t = await getTranslations({ locale, namespace: "ServiceDetail" });
  return { title: `Violetta — ${service.name} · ${t("meta_subtitle")}` };
}

export default async function ServiceDetailRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const service = await loadServiceByIdForLocale(id, locale);
  if (!service) notFound();
  const settings = await getSiteSettingsServer();
  const resolvedPrice = resolvePrice(
    `service:${service.id}`,
    service.price,
    settings,
  );
  const currency =
    ((settings as { currency?: CurrencyCode }).currency ?? "EUR");
  return (
    <ServiceDetailPage
      service={service}
      resolvedPrice={resolvedPrice}
      currency={currency}
      locale={locale}
      telegramUsername={settings.telegramUsername}
    />
  );
}
