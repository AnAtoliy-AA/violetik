import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ConfirmationPage } from "@/views/confirmation";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Confirmation" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function ConfirmationRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ConfirmationPage />;
}
