import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { TrackedLink } from "@/shared/lib/analytics/tracked-link";
import { getNextOpening } from "@/shared/lib/atelier/next-opening";
import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZoneFallback,
} from "@/shared/lib/google-calendar/working-hours";

/**
 * §5.1 — single live-availability line under the home hero.
 *
 *   NEXT OPENING · TONIGHT 21:00 · MANICURE COUTURE   ─→
 *
 * Server-rendered so the time text arrives statically rather than
 * hydrating on the client (Phase 2 perf target — don't re-fetch in
 * the client where we already have it server-side).
 */
export async function NextOpeningLine() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Home");

  const services = await loadServicesForLocale(locale);
  const headlineService = services[0]?.name;
  const headlineServiceId = services[0]?.id;
  const now = new Date();
  const next = getNextOpening({
    workingHours: WEEKLY_DEFAULT_HOURS,
    timeZone: bookingTimeZoneFallback(),
    now,
    serviceLabel: headlineService,
  });

  if (!next) {
    return (
      <div className="px-[22px] pb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
        {t("next_opening_fully_booked")}
      </div>
    );
  }

  // Pre-select the headline service so the booking page lands on the
  // When step with a complete store (service + date + time) — no
  // bounce off Confirm for missing-service.
  const hrefParams = new URLSearchParams();
  if (next.isToday) hrefParams.set("prefilter", "tonight");
  hrefParams.set("time", next.time);
  if (!next.isToday) hrefParams.set("date", next.date);
  if (headlineServiceId) hrefParams.set("selected", headlineServiceId);
  const href = `/booking/when?${hrefParams.toString()}`;

  const dayLabel = next.isToday
    ? null
    : new Intl.DateTimeFormat(locale, { weekday: "short" })
        .format(
          (() => {
            const [y, m, d] = next.date.split("-").map(Number);
            return new Date(y, m - 1, d);
          })(),
        )
        .toUpperCase();

  return (
    <TrackedLink
      href={href}
      event="home_next_opening_tapped"
      aria-label={t("next_opening_eyebrow")}
      className="group block px-[22px] pb-3 pt-1"
    >
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-2 group-hover:text-text">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-status-open motion-safe:animate-soft-pulse"
        />
        <span>{t("next_opening_eyebrow")}</span>
        <span aria-hidden>·</span>
        <span>
          {next.isToday
            ? t("next_opening_tonight", {
                time: next.time,
                service: next.serviceLabel ?? "—",
              })
            : t("next_opening_day", {
                day: dayLabel ?? "",
                time: next.time,
                service: next.serviceLabel ?? "—",
              })}
        </span>
        <span aria-hidden className="ml-2 font-display italic text-gold">
          ─→
        </span>
      </span>
    </TrackedLink>
  );
}
