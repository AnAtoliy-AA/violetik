import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice, type ResolvedPrice } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import { ServicesCatalogPage } from "@/views/services-catalog";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string };

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
  setRequestLocale(locale);
  const settings = await getSiteSettingsServer();
  const pricedServices: Record<string, ResolvedPrice> = {};
  for (const s of STUDIO_DATA.services) {
    pricedServices[s.id] = resolvePrice(`service:${s.id}`, s.price, settings);
  }
  return <ServicesCatalogPage pricedServices={pricedServices} />;
}
