import { loadServicesForLocale } from "@/entities/service/api/load";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  buildTonightStripData,
  localizedDayName,
} from "../lib/get-tonight-data";
import { getNextOpening } from "@/shared/lib/atelier/next-opening";
import { WEEKLY_DEFAULT_HOURS } from "@/shared/lib/google-calendar/working-hours";
import { TonightStripClient } from "./tonight-strip-client";

export interface TonightStripProps {
  className?: string;
}

/**
 * Server-rendered tonight strip. Reads working hours + the first
 * published service for a representative label, builds the strip
 * payload, then delegates to TonightStripClient for dismiss + marquee.
 */
export async function TonightStrip({ className }: TonightStripProps) {
  const locale = (await getLocale()) as Locale;
  const services = await loadServicesForLocale(locale);
  const serviceLabel = services[0]?.name;
  const serviceId = services[0]?.id ?? null;

  const data = buildTonightStripData({ serviceLabel });

  // Hydrate the dayName for the "fully booked" fallback locale-aware,
  // and thread the headline serviceId through every slot so the booking
  // link can `?selected=` the ritual the visitor saw next to the time.
  let payload = data
    ? {
        ...data,
        serviceId,
        laterSlots: data.laterSlots?.map((s) => ({ ...s, serviceId })),
      }
    : null;
  if (data && !data.isToday) {
    const next = getNextOpening({
      workingHours: WEEKLY_DEFAULT_HOURS,
      serviceLabel,
    });
    if (next) {
      const dayName = await localizedDayName(next.date);
      payload = {
        ...data,
        serviceId,
        laterSlots: data.laterSlots?.map((s) => ({ ...s, serviceId })),
        next: {
          dayName,
          time: next.time,
          service: next.serviceLabel ?? null,
          serviceId,
        },
      };
    }
  }

  return <TonightStripClient data={payload} className={className} />;
}
