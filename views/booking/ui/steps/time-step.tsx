"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import {
  BOOKING_TIMES,
  formatLongDate,
} from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";

const STATIC_FALLBACK: readonly string[] = BOOKING_TIMES;

export function TimeStep() {
  const t = useTranslations("Booking.time");
  const locale = useLocale();
  const selected = useBookingStore((s) => s.time);
  const setTime = useBookingStore((s) => s.setTime);
  const date = useBookingStore((s) => s.date);
  const serviceId = useBookingStore((s) => s.serviceId);

  const [slots, setSlots] = useState<readonly string[]>(STATIC_FALLBACK);

  useEffect(() => {
    if (!date || !serviceId) return;
    const controller = new AbortController();
    fetch(`/api/booking/slots?date=${date}&serviceId=${serviceId}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: { slots?: string[] }) => {
        if (Array.isArray(json.slots)) setSlots(json.slots);
      })
      .catch(() => {
        /* keep STATIC_FALLBACK */
      });
    return () => controller.abort();
  }, [date, serviceId]);

  const dateLabel = date ? formatLongDate(date, locale) : null;

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-h2 font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <LetterpressRule className="mb-4 mt-3 max-w-[180px]" />
      <p className="m-0 mb-5 text-sm text-text-2">
        {dateLabel ? (
          <>
            <span className="text-gold">{dateLabel}</span> · {t("zone_suffix")}
          </>
        ) : (
          t("no_date")
        )}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {slots.map((slot) => {
          const isSelected = selected === slot;
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTime(slot)}
              className={cn(
                "gilded rounded-[18px] px-4 py-5 text-left",
                "transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                isSelected
                  ? "glass-top text-gold-shimmer"
                  : "text-text hover:bg-surface-2",
              )}
            >
              <div className="font-display text-[26px] font-normal italic leading-none">
                {slot}
              </div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] opacity-70">
                {t("available")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
