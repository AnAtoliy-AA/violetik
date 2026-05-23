import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HomePage } from "@/views/home";
import { loadMastersForLocale } from "@/entities/master/api/load";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { listApprovedTestimonials } from "@/entities/testimonial";
import type { Locale } from "@/i18n/routing";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function HomeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [masters, settings, latestTestimonials] = await Promise.all([
    loadMastersForLocale(locale as Locale, { publishedOnly: true }),
    getSiteSettingsServer(),
    listApprovedTestimonials({ limit: 1 }),
  ]);
  const testimonial = latestTestimonials[0] ?? null;
  return (
    <HomePage
      master={masters[0]}
      settings={settings}
      locale={locale as Locale}
      testimonial={testimonial}
    />
  );
}
