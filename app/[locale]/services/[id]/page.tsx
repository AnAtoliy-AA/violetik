import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import { routing } from "@/i18n/routing";
import { ServiceDetailPage } from "@/views/service-detail";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; id: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    STUDIO_DATA.services.map((s) => ({ locale, id: s.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const service = STUDIO_DATA.services.find((s) => s.id === id);
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
  setRequestLocale(locale);
  const service = STUDIO_DATA.services.find((s) => s.id === id);
  if (!service) notFound();
  const settings = await getSiteSettingsServer();
  const resolvedPrice = resolvePrice(
    `service:${service.id}`,
    service.price,
    settings,
  );
  return <ServiceDetailPage service={service} resolvedPrice={resolvedPrice} />;
}
