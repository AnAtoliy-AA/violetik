import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { loadMastersForLocale } from "@/entities/master/api/load";
import {
  resolvePrice,
  studioLocationLine,
  type ResolvedPrice,
} from "@/entities/site-settings";
import type { CurrencyCode } from "@/db/schema";
import { routing, type Locale } from "@/i18n/routing";
import {
  BookingPage,
  BOOKING_STEPS,
  isBookingStep,
} from "@/views/booking";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; step: string };

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

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
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  if (!isBookingStep(step)) notFound();
  const [settings, services, masters] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale),
    loadMastersForLocale(locale, { publishedOnly: true }),
  ]);
  const pricedServices: Record<string, ResolvedPrice> = {};
  for (const s of services) {
    pricedServices[s.id] = resolvePrice(`service:${s.id}`, s.price, settings);
  }
  const currency =
    ((settings as { currency?: CurrencyCode }).currency ?? "EUR");
  const location = studioLocationLine(settings, locale);
  return (
    <Suspense fallback={null}>
      <BookingPage
        step={step}
        services={services}
        pricedServices={pricedServices}
        currency={currency}
        masters={masters}
        location={location}
      />
    </Suspense>
  );
}
