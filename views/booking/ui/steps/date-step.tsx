"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import {
  bookingStartISO,
  buildDateStrip,
  formatMonthYear,
} from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";

export interface DateStepProps {
  timeZone: string;
}

export function DateStep({ timeZone }: DateStepProps) {
  const t = useTranslations("Booking.date");
  const locale = useLocale();
  const selected = useBookingStore((s) => s.date);
  const setDate = useBookingStore((s) => s.setDate);

  const days = useMemo(
    () => buildDateStrip(locale, timeZone),
    [locale, timeZone],
  );
  const monthLabel = useMemo(
    () => formatMonthYear(bookingStartISO(new Date(), timeZone), locale),
    [locale, timeZone],
  );

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-h2 font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <LetterpressRule className="mb-4 mt-3 max-w-[180px]" />
      <p className="m-0 mb-5 text-sm text-text-2">
        {t.rich("paragraph", {
          gold: (c) => <span className="text-gold">{c}</span>,
        })}
      </p>

      <div className="mb-3.5 font-display text-[22px] italic capitalize">
        {monthLabel}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isSelected = !d.disabled && selected === d.iso;
          return (
            <button
              key={d.iso}
              type="button"
              disabled={d.disabled}
              aria-pressed={isSelected}
              aria-label={`${d.dow} ${d.day}`}
              onClick={() => setDate(d.iso)}
              className={cn(
                "relative aspect-[1/1.15] rounded-[12px]",
                "flex flex-col items-center justify-center gap-0.5",
                "transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                d.disabled
                  ? "cursor-not-allowed border-[0.5px] border-transparent bg-surface/40 text-text-3 opacity-40"
                  : isSelected
                    ? "text-bg"
                    : "gilded text-text hover:bg-surface-2",
              )}
            >
              {isSelected ? (
                <motion.span
                  layoutId="date-pill"
                  className="absolute inset-0 rounded-[12px] bg-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]"
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  style={{ zIndex: -1 }}
                />
              ) : null}
              <span className="relative font-mono text-[9px] uppercase tracking-[0.08em] opacity-70">
                {d.dow}
              </span>
              <span className="relative font-display text-[22px] font-normal">
                {d.day}
              </span>
            </button>
          );
        })}
      </div>

      <div className="gilded glass-top mt-5 rounded-[18px] p-3.5">
        <Eyebrow>{t("hours_eyebrow")}</Eyebrow>
        <div className="mt-2 text-[13px] text-text-2">{t("hours")}</div>
      </div>
    </div>
  );
}
