"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { emitAnalytics } from "@/shared/lib/analytics/emit";
import { Marquee } from "@/shared/ui/marquee";
import { GlassSurface } from "@/shared/ui/glass-surface";

/** A day the strip queries for openings, with its localized label. */
export interface TonightStripDay {
  /** Studio-timezone date YYYY-MM-DD. */
  dateISO: string;
  /** Locale-aware short day label, e.g. "TODAY" or "TUE". */
  dayLabel: string;
  /** True when this day is today (drives the "TODAY" label). */
  isToday: boolean;
}

/** One resolved opening, ready to render in the marquee. */
interface SlotView {
  time: string;
  dateISO: string;
  dayLabel: string;
  isToday: boolean;
}

const SESSION_KEY = "violetta.tonight-strip-dismissed";

export interface TonightStripClientProps {
  /** First published service id — used for the live slot query + link. */
  serviceId: string | null;
  /** Today + tomorrow in studio time, with labels. */
  days: TonightStripDay[];
  className?: string;
}

export function TonightStripClient({
  serviceId,
  days,
  className,
}: TonightStripClientProps) {
  const t = useTranslations("Tonight");
  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // null = still loading; [] = loaded, no openings.
  const [slots, setSlots] = useState<SlotView[] | null>(null);

  useEffect(() => {
    // SSR/hydration gate — flip after mount so we can read sessionStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setHidden(true);
      }
    } catch {
      /* sessionStorage may be unavailable (private mode) */
    }
  }, []);

  // Ask the SAME endpoint the booking flow's time grid uses, so the strip
  // shows exactly the times a visitor can actually book — real Google
  // Calendar + DB busy windows, real service duration, real lead time.
  const daysKey = days.map((d) => d.dateISO).join(",");
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      // Nothing to query (no published service / no days) → resolved empty.
      if (!serviceId || days.length === 0) {
        if (!cancelled) setSlots([]);
        return;
      }
      const collected: SlotView[] = [];
      for (const day of days) {
        try {
          const res = await fetch(
            `/api/booking/slots?date=${day.dateISO}&serviceId=${serviceId}`,
            { signal: controller.signal },
          );
          const json = (await res.json()) as { slots?: string[] };
          if (Array.isArray(json.slots)) {
            for (const time of json.slots) {
              collected.push({
                time,
                dateISO: day.dateISO,
                dayLabel: day.dayLabel,
                isToday: day.isToday,
              });
            }
          }
        } catch {
          /* skip this day; a network blip shouldn't blank the strip */
        }
      }
      if (!cancelled) setSlots(collected);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // daysKey captures the meaningful identity of `days`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, daysKey]);

  if (hidden) return null;
  // Avoid rendering before hydration so SSR/client output match, and while
  // the live availability is still loading (no flash of stale times).
  if (!hydrated || slots === null) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
  };

  const buildHref = (slot: SlotView): string => {
    // Land on step 1 (service) with the ritual preselected, carrying the
    // chosen day + time so the later "when" step opens already filled in.
    // The booking page reads selected/date/time into the store on mount.
    const p = new URLSearchParams();
    if (serviceId) p.set("selected", serviceId);
    p.set("date", slot.dateISO);
    p.set("time", slot.time);
    return `/booking/service?${p.toString()}`;
  };

  const hasSlots = slots.length > 0;

  return (
    <GlassSurface
      tint="warm"
      blur="md"
      rim
      elevation={1}
      aria-label={t("label")}
      className={
        "relative w-full border-y border-line/40 " + (className ?? "")
      }
    >
      {hasSlots ? (
        <Marquee className="py-2" duration="48s">
          {slots.flatMap((s, i) => [
            <span
              key={`dot-${i}`}
              aria-hidden
              className="font-mono text-text-3 text-xs"
            >
              ·
            </span>,
            <Link
              key={`slot-${i}`}
              href={buildHref(s)}
              onClick={() => emitAnalytics("tonight_ribbon_tapped")}
              className="relative font-mono uppercase tracking-[0.2em] text-[10px] text-text-2 hover:text-text whitespace-nowrap before:absolute before:-inset-y-[14px] before:-inset-x-1 before:content-['']"
            >
              <span className="text-accent">{s.dayLabel}</span> {s.time}
            </Link>,
          ])}
        </Marquee>
      ) : (
        <div className="px-4 py-2 text-center">
          <Link
            href="/booking"
            onClick={() => emitAnalytics("tonight_ribbon_tapped")}
            className="font-mono uppercase tracking-[0.2em] text-[10px] text-text-2 hover:text-text"
          >
            {t("none_today_tomorrow")}
          </Link>
        </div>
      )}
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={dismiss}
        className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-text-3 hover:text-text-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </GlassSurface>
  );
}
