import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { listBookingsForAdmin } from "@/db/bookings";
import { listAllServices } from "@/db/services";
import { bookingTimeZoneFromSettings } from "@/shared/lib/google-calendar";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import {
  BookingActions,
  BookingsRefreshControls,
} from "@/features/bookings-admin";
import { VipBadge } from "@/shared/ui/vip-badge";
import type { Booking } from "@/db/schema";
import { cn } from "@/shared/lib/cn";

type BookingStatus = Booking["status"];

const STATUS_PILL_CLASS: Record<BookingStatus, string> = {
  pending:
    "border border-accent/40 bg-accent/15 text-accent",
  confirmed:
    "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  cancelled:
    "border border-line bg-transparent text-text-3 line-through decoration-text-3/60",
  completed:
    "border border-line-strong bg-transparent text-text-2",
};

const STATUS_CARD_CLASS: Record<BookingStatus, string> = {
  pending: "",
  confirmed: "",
  cancelled: "opacity-55 saturate-50",
  completed: "opacity-80",
};

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
  const [settings, bookings, allServices] = await Promise.all([
    getSiteSettingsServer(),
    listBookingsForAdmin(),
    listAllServices(),
  ]);
  const tz = bookingTimeZoneFromSettings(settings);
  const serviceById = new Map(allServices.map((s) => [s.id, s]));
  const initialPendingCount = bookings.filter(
    (b) => b.status === "pending",
  ).length;

  return (
    <div className="pb-16">
      <AppHeader
        back="/admin"
        title={t("meta_title")}
        admin
        actions={
          <BookingsRefreshControls initialPendingCount={initialPendingCount} />
        }
      />

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
            const masterName =
              locale === "ru"
                ? b.masterNameRu
                : locale === "by"
                  ? b.masterNameBy
                  : b.masterNameEn;
            return (
              <li
                key={b.id}
                data-status={b.status}
                className={cn(
                  "gilded rounded-[18px] p-5 transition-opacity",
                  STATUS_CARD_CLASS[b.status],
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[22px] italic">
                    {service?.nameEn ?? b.serviceId}
                  </div>
                  <div
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
                      STATUS_PILL_CLASS[b.status],
                    )}
                  >
                    {tStatus(b.status)}
                  </div>
                </div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  {masterName ?? "—"}
                </div>
                <div className="mt-1 text-[13px] text-text-2">
                  {formatScheduled(b.scheduledFor, locale, tz)} ·{" "}
                  {b.durationMinutes} min
                </div>
                <div className="mt-1 flex items-center gap-2 text-[13px] text-text">
                  <span>{customerLabel(b)}</span>
                  {b.userIsVip ? <VipBadge size="xs" /> : null}
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
