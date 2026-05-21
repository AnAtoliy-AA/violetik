import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice, type ResolvedPrice } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import { routing } from "@/i18n/routing";
import {
  BookingPage,
  BOOKING_STEPS,
  isBookingStep,
} from "@/views/booking";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; step: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    BOOKING_STEPS.map((step) => ({ locale, step })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, step } = await params;
  if (!isBookingStep(step)) return { title: "Violetta" };
  const t = await getTranslations({ locale, namespace: "Booking" });
  return { title: `Violetta — ${t("meta_title")} · ${t(`steps.${step}`)}` };
}

export default async function BookingRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, step } = await params;
  setRequestLocale(locale);
  if (!isBookingStep(step)) notFound();
  const settings = await getSiteSettingsServer();
  const pricedServices: Record<string, ResolvedPrice> = {};
  for (const s of STUDIO_DATA.services) {
    pricedServices[s.id] = resolvePrice(`service:${s.id}`, s.price, settings);
  }
  return (
    <Suspense fallback={null}>
      <BookingPage step={step} pricedServices={pricedServices} />
    </Suspense>
  );
}
