import { loadServicesForLocale } from "@/entities/service/api/load";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  tonightCandidateDays,
  weekdayLabel,
} from "../lib/get-tonight-data";
import {
  TonightStripClient,
  type TonightStripDay,
} from "./tonight-strip-client";

export interface TonightStripProps {
  className?: string;
}

/**
 * Server shell for the tonight ribbon. Resolves the first published
 * service id (for the live slot query + booking link) and the two
 * candidate days (today + tomorrow) with locale-aware labels. The client
 * then fetches genuinely-open times from `/api/booking/slots` — the same
 * endpoint the booking flow's time grid uses — so the ribbon can never
 * drift from real availability.
 */
export async function TonightStrip({ className }: TonightStripProps) {
  const locale = (await getLocale()) as Locale;
  const [t, services] = await Promise.all([
    getTranslations("Tonight"),
    loadServicesForLocale(locale),
  ]);
  const serviceId = services[0]?.id ?? null;

  const days: TonightStripDay[] = tonightCandidateDays().map((d) => ({
    dateISO: d.dateISO,
    isToday: d.isToday,
    dayLabel: d.isToday ? t("today") : weekdayLabel(d.dateISO, locale),
  }));

  return (
    <TonightStripClient
      serviceId={serviceId}
      days={days}
      className={className}
    />
  );
}
