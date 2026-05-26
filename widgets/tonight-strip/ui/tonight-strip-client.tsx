"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { emitAnalytics } from "@/shared/lib/analytics/emit";
import { Marquee } from "@/shared/ui/marquee";

export interface TonightStripData {
  isToday: boolean;
  time: string;
  service: string | null;
  /** Additional same-day slots (excluding `time`) to make the marquee feel populated. */
  laterSlots?: ReadonlyArray<{ time: string; service: string | null }>;
  /** Used when `isToday` is false — the next available day/time. */
  next?: { dayName: string; time: string; service: string | null };
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

  const slots: Array<{ time: string; service: string | null; href: string }> =
    data.isToday
      ? [
          {
            time: data.time,
            service: data.service,
            href: `/booking/time?prefilter=tonight&time=${encodeURIComponent(data.time)}`,
          },
          ...(data.laterSlots ?? []).map((s) => ({
            time: s.time,
            service: s.service,
            href: `/booking/time?prefilter=tonight&time=${encodeURIComponent(s.time)}`,
          })),
        ]
      : data.next
        ? [
            {
              time: data.next.time,
              service: data.next.service,
              href: `/booking/time?time=${encodeURIComponent(data.next.time)}`,
            },
          ]
        : [];

  return (
    <div
      aria-label={t("label")}
      className={
        "relative w-full border-y border-line/40 bg-bg/70 backdrop-blur-sm " +
        (className ?? "")
      }
    >
      {data.isToday ? (
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
              href={s.href}
              onClick={() => emitAnalytics("tonight_ribbon_tapped")}
              className="font-mono uppercase tracking-[0.2em] text-[10px] text-text-2 hover:text-text whitespace-nowrap"
            >
              {s.time} {s.service ?? ""}
            </Link>,
          ])}
        </Marquee>
      ) : data.next ? (
        <div className="px-4 py-2 text-center">
          <Link
            href={slots[0]?.href ?? "/booking"}
            onClick={() => emitAnalytics("tonight_ribbon_tapped")}
            className="font-mono uppercase tracking-[0.2em] text-[10px] text-text-2 hover:text-text"
          >
            {t("fully_booked", {
              day: data.next.dayName,
              time: data.next.time,
              service: data.next.service ?? "—",
            })}
          </Link>
        </div>
      ) : null}
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 px-2 leading-none"
      >
        ×
      </button>
    </div>
  );
}
