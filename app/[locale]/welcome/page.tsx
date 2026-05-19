import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WelcomePage } from "@/views/welcome";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Welcome" });
  return { title: `Violetta — ${t("cta_enter")}` };
}

export default async function WelcomeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WelcomePage />;
}
