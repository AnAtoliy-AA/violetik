import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ConfirmationPage } from "@/views/confirmation";
import { getBookingById } from "@/db/bookings";
import { loadServiceByIdForLocale } from "@/entities/service/api/load";
import { bookingTimeZone } from "@/shared/lib/google-calendar";
import { routing, type Locale } from "@/i18n/routing";

type Params = { locale: string };
type Search = { id?: string };

// Confirmation must reflect the freshly-created row in the DB; static
// caching would show stale data.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Confirmation" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function formatLocalDate(date: Date, timeZone: string): string {
  // YYYY-MM-DD in the salon TZ.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

function formatLocalTime(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date);
}

export default async function ConfirmationRoute({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const { id } = await searchParams;
  setRequestLocale(locale);

  if (!id) {
    return <ConfirmationPage />;
  }

  const booking = await getBookingById(id);
  if (!booking) {
    return <ConfirmationPage />;
  }

  const tz = bookingTimeZone();
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  const service = await loadServiceByIdForLocale(booking.serviceId, safeLocale);
  return (
    <ConfirmationPage
      bookingId={booking.id}
      serviceId={booking.serviceId}
      date={formatLocalDate(booking.scheduledFor, tz)}
      time={formatLocalTime(booking.scheduledFor, tz)}
      status={booking.status}
      service={service}
    />
  );
}
