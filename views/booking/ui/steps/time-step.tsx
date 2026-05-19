"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  BOOKING_TIMES,
  RESERVED_TIMES,
  formatLongDate,
} from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";

const RESERVED = new Set<string>(RESERVED_TIMES);

export function TimeStep() {
  const t = useTranslations("Booking.time");
  const locale = useLocale();
  const selected = useBookingStore((s) => s.time);
  const setTime = useBookingStore((s) => s.setTime);
  const date = useBookingStore((s) => s.date);

  const dateLabel = date ? formatLongDate(date, locale) : null;

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-[36px] font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
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
        {BOOKING_TIMES.map((slot) => {
          const reserved = RESERVED.has(slot);
          const isSelected = !reserved && selected === slot;
          return (
            <button
              key={slot}
              type="button"
              disabled={reserved}
              aria-pressed={isSelected}
              onClick={() => setTime(slot)}
              className={cn(
                "rounded-[18px] border-[0.5px] px-4 py-5 text-left",
                "transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                reserved
                  ? "cursor-not-allowed border-transparent bg-surface/40 text-text-3 opacity-40"
                  : isSelected
                    ? "border-accent bg-[color-mix(in_oklab,var(--color-accent)_16%,var(--color-surface))] text-accent"
                    : "border-line bg-surface text-text hover:border-line-strong",
              )}
            >
              <div className="font-display text-[26px] font-normal italic leading-none">
                {slot}
              </div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] opacity-70">
                {reserved ? t("reserved") : t("available")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
