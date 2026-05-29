"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { emitAnalytics } from "@/shared/lib/analytics/emit";
import { Marquee } from "@/shared/ui/marquee";
import { GlassSurface } from "@/shared/ui/glass-surface";

/** One opening enriched with a locale-aware day label, ready to render. */
export interface TonightStripSlotView {
  /** Local "HH:MM" start time. */
  time: string;
  /**
   * §3.3 / §6.2 — service id used to pre-select the ritual in the booking
   * store via `?selected=` so the visitor doesn't bounce off Confirm.
   */
  serviceId?: string | null;
  /** Locale-aware short day label, e.g. "TODAY" or "TUE". */
  dayLabel: string;
  /** True when this slot is today (drives the `prefilter=tonight` link). */
  isToday: boolean;
  /** Studio-timezone date YYYY-MM-DD — used as the `date` link param. */
  dateISO: string;
}

export interface TonightStripData {
  /** Today's + tomorrow's openings, in order. Empty → fully booked. */
  slots: ReadonlyArray<TonightStripSlotView>;
}

const SESSION_KEY = "violetta.tonight-strip-dismissed";

export interface TonightStripClientProps {
  data: TonightStripData | null;
  className?: string;
}

export function TonightStripClient({
  data,
  className,
}: TonightStripClientProps) {
  const t = useTranslations("Tonight");
  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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

  if (!data || hidden) return null;

  // Avoid rendering before hydration so SSR/client output match.
  if (!hydrated) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
  };

  const buildHref = (slot: TonightStripSlotView): string => {
    const p = new URLSearchParams();
    if (slot.isToday) {
      p.set("prefilter", "tonight");
    } else {
      p.set("date", slot.dateISO);
    }
    p.set("time", slot.time);
    if (slot.serviceId) p.set("selected", slot.serviceId);
    return `/booking/when?${p.toString()}`;
  };

  const hasSlots = data.slots.length > 0;

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
          {data.slots.flatMap((s, i) => [
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
              className="font-mono uppercase tracking-[0.2em] text-[10px] text-text-2 hover:text-text whitespace-nowrap"
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
        className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center text-text-3 hover:text-text-2 leading-none"
      >
        ×
      </button>
    </GlassSurface>
  );
}
