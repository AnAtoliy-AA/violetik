import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { listBookingsForAdmin } from "@/db/bookings";
import { listAllServices } from "@/db/services";
import { bookingTimeZone } from "@/shared/lib/google-calendar";
import { BookingActions } from "@/features/bookings-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminBookings" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function formatScheduled(at: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

function customerLabel(b: {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
  userId: string;
}): string {
  const name = [b.userFirstName, b.userLastName].filter(Boolean).join(" ");
  return name || b.userEmail || b.username || b.userId;
}

export default async function AdminBookingsRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  setRequestLocale(locale);
  const t = await getTranslations("AdminBookings");
  const tStatus = await getTranslations("AdminBookings.status");
  const tz = bookingTimeZone();
  const [bookings, allServices] = await Promise.all([
    listBookingsForAdmin(),
    listAllServices(),
  ]);
  const serviceById = new Map(allServices.map((s) => [s.id, s]));

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("meta_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      {bookings.length === 0 ? (
        <p className="px-[22px] font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3 px-[22px]">
          {bookings.map((b) => {
            const service = serviceById.get(b.serviceId);
            const isPending = b.status === "pending";
            return (
              <li
                key={b.id}
                className="gilded rounded-[18px] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[22px] italic">
                    {service?.nameEn ?? b.serviceId}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {tStatus(b.status)}
                  </div>
                </div>
                <div className="mt-1 text-[13px] text-text-2">
                  {formatScheduled(b.scheduledFor, locale, tz)} ·{" "}
                  {b.durationMinutes} min
                </div>
                <div className="mt-1 text-[13px] text-text">
                  {customerLabel(b)}
                </div>
                {isPending ? (
                  <div className="mt-3">
                    <BookingActions
                      bookingId={b.id}
                      confirmLabel={t("cta_confirm")}
                      declineLabel={t("cta_decline")}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
