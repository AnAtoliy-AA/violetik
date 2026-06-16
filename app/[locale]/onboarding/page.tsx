import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { OnboardingPage } from "@/views/onboarding";
import { loadOnboardingSlides } from "@/entities/onboarding/api/load";
import { buildPageMetadata } from "@/shared/lib/page-metadata";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, pageId: "onboarding", path: "/onboarding" });
}

export default async function OnboardingRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const slides = await loadOnboardingSlides(locale as Locale);
  return <OnboardingPage slides={slides} />;
}
