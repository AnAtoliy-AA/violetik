import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadMasterBySlugForLocale } from "@/entities/master/api/load";
import { MasterPage } from "@/views/master";
import type { Locale } from "@/i18n/routing";

type Params = { locale: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Master" });
  const master = await loadMasterBySlugForLocale(slug, locale as Locale);
  if (!master) return { title: `Violetta — ${t("meta_title")}` };
  return { title: `Violetta — ${master.name}` };
}

export default async function MasterDetailRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const master = await loadMasterBySlugForLocale(slug, locale as Locale);
  if (!master || master.status !== "published") notFound();
  // Testimonials are streamed inside MasterPage via Suspense.
  return <MasterPage master={master} />;
}
