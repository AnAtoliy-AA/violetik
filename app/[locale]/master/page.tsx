import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadMastersForLocale } from "@/entities/master/api/load";
import { MasterPage } from "@/views/master";
import { MastersListPage } from "@/views/masters-list";
import type { Locale } from "@/i18n/routing";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Master" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function MasterRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const masters = await loadMastersForLocale(locale as Locale, {
    publishedOnly: true,
  });
  if (masters.length === 1) {
    // Testimonials are streamed inside MasterPage via Suspense.
    return <MasterPage master={masters[0]} />;
  }
  return <MastersListPage masters={masters} />;
}
