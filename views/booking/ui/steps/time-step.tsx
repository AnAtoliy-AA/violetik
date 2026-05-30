"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
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

export interface TimeStepProps {
  /**
   * §6.2 — when nested under WhenStep, skip the eyebrow + heading +
   * paragraph chrome. The parent owns the page's h2.
   */
  headless?: boolean;
}

export function TimeStep({ headless = false }: TimeStepProps = {}) {
  const t = useTranslations("Booking.time");
  const locale = useLocale();
  const selected = useBookingStore((s) => s.time);
  const setTime = useBookingStore((s) => s.setTime);
  const date = useBookingStore((s) => s.date);
  const serviceId = useBookingStore((s) => s.serviceId);

  const [slots, setSlots] = useState<readonly string[]>(STATIC_FALLBACK);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!date || !serviceId) return;
    const controller = new AbortController();
    fetch(`/api/booking/slots?date=${date}&serviceId=${serviceId}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: { slots?: string[] }) => {
        if (Array.isArray(json.slots)) setSlots(json.slots);
        setHasFetched(true);
      })
      .catch(() => {
        /* keep STATIC_FALLBACK; do NOT set hasFetched */
      });
    return () => controller.abort();
  }, [date, serviceId]);

  const dateLabel = date ? formatLongDate(date, locale) : null;

  return (
    <div>
      {headless ? null : (
        <>
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
        </>
      )}

      {hasFetched && slots.length === 0 ? (
        <p
          role="status"
          className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-text-3"
        >
          {t("none_available")}
        </p>
      ) : (
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
                  "relative overflow-hidden rounded-[18px] px-4 py-5 text-left",
                  "transition-colors duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  isSelected
                    ? "text-bg"
                    : "gilded text-text hover:bg-surface-2",
                )}
              >
                {/* Selected pill — gold fill behind the text, layoutId so
                  * tapping a new slot morphs across the grid. The shimmer
                  * sweep on top adds the requested 'blick'. */}
                {isSelected ? (
                  <>
                    <m.span
                      layoutId="time-pill"
                      aria-hidden
                      className="absolute inset-0 rounded-[18px] bg-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]"
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 motion-safe:animate-[shimmer_2.6s_ease-in-out_infinite]"
                      style={{
                        background:
                          "linear-gradient(120deg, transparent 30%, rgba(255,245,214,0.55) 50%, transparent 70%)",
                        backgroundSize: "200% 100%",
                        mixBlendMode: "screen",
                      }}
                    />
                  </>
                ) : null}
                <div className="relative font-display text-[26px] font-normal italic leading-none">
                  {slot}
                </div>
                <div className="relative mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] opacity-70">
                  {t("available")}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
