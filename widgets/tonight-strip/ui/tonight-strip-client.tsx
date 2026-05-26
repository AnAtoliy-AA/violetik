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
  /**
   * §3.3 / §6.2 — service id used to pre-select the ritual in the
   * booking store via `?selected=` so the visitor doesn't bounce off
   * Confirm for missing-service after picking a slot.
   */
  serviceId?: string | null;
  /** Additional same-day slots (excluding `time`) to make the marquee feel populated. */
  laterSlots?: ReadonlyArray<{
    time: string;
    service: string | null;
    serviceId?: string | null;
  }>;
  /** Used when `isToday` is false — the next available day/time. */
  next?: {
    dayName: string;
    time: string;
    service: string | null;
    serviceId?: string | null;
  };
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

  const buildHref = (
    opts: { time: string; serviceId?: string | null; tonight: boolean },
  ): string => {
    const p = new URLSearchParams();
    if (opts.tonight) p.set("prefilter", "tonight");
    p.set("time", opts.time);
    if (opts.serviceId) p.set("selected", opts.serviceId);
    return `/booking/when?${p.toString()}`;
  };

  const slots: Array<{ time: string; service: string | null; href: string }> =
    data.isToday
      ? [
          {
            time: data.time,
            service: data.service,
            href: buildHref({
              time: data.time,
              serviceId: data.serviceId,
              tonight: true,
            }),
          },
          ...(data.laterSlots ?? []).map((s) => ({
            time: s.time,
            service: s.service,
            href: buildHref({
              time: s.time,
              serviceId: s.serviceId ?? data.serviceId,
              tonight: true,
            }),
          })),
        ]
      : data.next
        ? [
            {
              time: data.next.time,
              service: data.next.service,
              href: buildHref({
                time: data.next.time,
                serviceId: data.next.serviceId,
                tonight: false,
              }),
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
        className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center text-text-3 hover:text-text-2 leading-none"
      >
        ×
      </button>
    </div>
  );
}
