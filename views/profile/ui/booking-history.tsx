import { getTranslations } from "next-intl/server";
import { bucketBookings } from "@/entities/booking";
import { getCachedUserBookings, getCachedAllServices } from "../api/loaders";

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function BookingHistory({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const [t, bookings, services] = await Promise.all([
    getTranslations("Profile"),
    getCachedUserBookings(userId),
    getCachedAllServices(),
  ]);

  const { history } = bucketBookings(bookings, new Date());
  const completedHistory = history.slice(0, 20);

  const serviceName = (id: string): string => {
    const s = services.find((row) => row.id === id);
    if (!s) return id;
    return locale === "ru" ? s.nameRu : locale === "by" ? s.nameBy : s.nameEn;
  };

  if (completedHistory.length === 0) {
    return <p className="mt-3 text-[13px] text-text-3">{t("history_empty")}</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-line">
      {completedHistory.map((row) => (
        <li
          key={row.id}
          className="flex items-baseline justify-between py-3.5"
        >
          <div>
            <p className="font-display text-[19px] font-normal italic leading-tight">
              {serviceName(row.serviceId)}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
              {formatDateTime(row.scheduledFor, locale)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
