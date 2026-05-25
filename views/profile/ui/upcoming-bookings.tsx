import { getTranslations } from "next-intl/server";
import {
  bucketBookings,
  canSelfCancel,
  type UserBookingRow,
} from "@/entities/booking";
import {
  cancelBookingAction,
  CancelBookingButton,
  ContactMasterLink,
} from "@/features/booking-cancel";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { NailFan } from "@/shared/ui/nail-fan";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import {
  getCachedUserBookings,
  getCachedAllServices,
  getCachedProfileWithPhoto,
} from "../api/loaders";

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function UpcomingBookings({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const [t, bookings, services, settings, profile] = await Promise.all([
    getTranslations("Profile"),
    getCachedUserBookings(userId),
    getCachedAllServices(),
    getSiteSettingsServer(),
    getCachedProfileWithPhoto(),
  ]);

  const now = new Date();
  const { upcoming } = bucketBookings(bookings, now);
  const next = upcoming[0];
  const otherUpcoming = upcoming.slice(1);
  const studioTelegram = settings.telegramUsername ?? null;

  const serviceName = (id: string): string => {
    const s = services.find((row) => row.id === id);
    if (!s) return id;
    return locale === "ru" ? s.nameRu : locale === "by" ? s.nameBy : s.nameEn;
  };

  const masterNameInLocale = (row: UserBookingRow): string | null => {
    if (locale === "ru") return row.masterNameRu;
    if (locale === "by") return row.masterNameBy;
    return row.masterNameEn;
  };

  const renderAction = (row: UserBookingRow) => {
    if (canSelfCancel(now, row.scheduledFor)) {
      return (
        <CancelBookingButton bookingId={row.id} action={cancelBookingAction} />
      );
    }
    return (
      <ContactMasterLink
        masterName={masterNameInLocale(row) ?? ""}
        masterTelegram={row.masterTelegramUsername}
        studioTelegram={studioTelegram}
      />
    );
  };

  if (!next) {
    return (
      <p className="mt-3 text-[13px] text-text-3">{t("upcoming_empty")}</p>
    );
  }

  return (
    <>
      <SpotlightCard
        as="article"
        aria-label={t("next_visit_eyebrow")}
        className="gilded-lift glass-top relative mt-3 overflow-hidden rounded-[28px] px-5 py-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 opacity-60"
        >
          <NailFan palette={profile.palette} count={4} lift={4} />
        </div>
        <Eyebrow>{t("next_visit_eyebrow")}</Eyebrow>
        <p className="mt-3 font-display text-[26px] font-normal italic leading-tight">
          {serviceName(next.serviceId)}
        </p>
        <p className="mt-1.5 text-[13px] text-text-2">
          {formatDateTime(next.scheduledFor, locale)}
        </p>
        {masterNameInLocale(next) ? (
          <p className="mt-1 text-[12px] text-text-3">
            {t("with_master", { name: masterNameInLocale(next) ?? "" })}
          </p>
        ) : null}
        <div className="mt-3.5">{renderAction(next)}</div>
      </SpotlightCard>
      {otherUpcoming.length > 0 ? (
        <ul className="mt-4 divide-y divide-line">
          {otherUpcoming.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-3 py-3.5"
            >
              <div className="min-w-0">
                <p className="font-display text-[18px] font-normal italic leading-tight">
                  {serviceName(row.serviceId)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                  {formatDateTime(row.scheduledFor, locale)}
                </p>
                {masterNameInLocale(row) ? (
                  <p className="mt-0.5 text-[12px] text-text-3">
                    {t("with_master", {
                      name: masterNameInLocale(row) ?? "",
                    })}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0">{renderAction(row)}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
