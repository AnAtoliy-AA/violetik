import type { Metadata } from "next";
import { setRequestLocale, getTranslations, getLocale } from "next-intl/server";
import { WelcomePage } from "@/views/welcome";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { getNextOpening } from "@/shared/lib/atelier/next-opening";
import { resolveAtelierStatus } from "@/widgets/atelier-hours/lib/resolve-status";
import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZoneFallback,
} from "@/shared/lib/google-calendar";
import type { Locale } from "@/i18n/routing";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Welcome" });
  return { title: `Violetta — ${t("cta_enter")}` };
}

export default async function WelcomeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const services = await loadServicesForLocale(locale as Locale);
  const headlineService = services[0]?.name ?? null;

  const now = new Date();
  const status = resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, now);
  const nextOpening = getNextOpening({
    workingHours: WEEKLY_DEFAULT_HOURS,
    timeZone: bookingTimeZoneFallback(),
    now,
    serviceLabel: headlineService ?? undefined,
    durationMin: 60,
  });

  // Resolve a localized day name for the "opens on" line and ribbon fallback.
  const localeBcp = await getLocale();
  let opensDayName: string | null = null;
  if (status.state === "closed") {
    // 2026-05-17 is a Sunday — offset by dayOfWeek for a printable label.
    const sample = new Date(2026, 4, 17, 12, 0);
    sample.setDate(sample.getDate() + status.opensAt.dayOfWeek);
    opensDayName = new Intl.DateTimeFormat(localeBcp, {
      weekday: "long",
    }).format(sample);
  }

  let nextDayName: string | null = null;
  if (nextOpening && !nextOpening.isToday) {
    const [y, m, d] = nextOpening.date.split("-").map(Number);
    nextDayName = new Intl.DateTimeFormat(localeBcp, {
      weekday: "short",
    })
      .format(new Date(y, m - 1, d))
      .toUpperCase();
  }

  return (
    <WelcomePage
      status={
        status.state === "open"
          ? { state: "open", closesAt: status.closesAt }
          : status.state === "closed"
            ? {
                state: "closed",
                day: opensDayName ?? "",
                time: status.opensAt.time,
              }
            : { state: "no-hours" }
      }
      nextOpening={
        nextOpening
          ? {
              date: nextOpening.date,
              time: nextOpening.time,
              isToday: nextOpening.isToday,
              service: nextOpening.serviceLabel ?? null,
              dayName: nextDayName,
            }
          : null
      }
    />
  );
}
