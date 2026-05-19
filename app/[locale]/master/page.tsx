import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { MasterPage } from "@/views/master";

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
  return <MasterPage />;
}
