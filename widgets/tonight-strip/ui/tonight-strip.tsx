import { loadServicesForLocale } from "@/entities/service/api/load";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  buildTonightStripData,
  weekdayLabel,
} from "../lib/get-tonight-data";
import {
  TonightStripClient,
  type TonightStripData,
} from "./tonight-strip-client";

export interface TonightStripProps {
  className?: string;
}

/**
 * Server-rendered tonight strip. Builds today's + tomorrow's openings,
 * resolves a locale-aware day label per slot, and threads the first
 * published service id through so each slot link pre-selects a ritual.
 * Delegates to TonightStripClient for dismiss + marquee.
 */
export async function TonightStrip({ className }: TonightStripProps) {
  const locale = (await getLocale()) as Locale;
  const [t, services] = await Promise.all([
    getTranslations("Tonight"),
    loadServicesForLocale(locale),
  ]);
  const serviceId = services[0]?.id ?? null;

  const availability = buildTonightStripData();

  const payload: TonightStripData | null = availability
    ? {
        slots: availability.slots.map((s) => ({
          time: s.time,
          serviceId,
          isToday: s.isToday,
          dateISO: s.dateISO,
          dayLabel: s.isToday ? t("today") : weekdayLabel(s.dateISO, locale),
        })),
      }
    : null;

  return <TonightStripClient data={payload} className={className} />;
}
