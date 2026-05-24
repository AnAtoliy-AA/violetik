import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { OnboardingPage } from "@/views/onboarding";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function OnboardingRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OnboardingPage />;
}
