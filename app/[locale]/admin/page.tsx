import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { SignOutButton } from "@/features/telegram-login";
import { listBookingsForAdmin } from "@/db/bookings";
import { listPendingVipRequests } from "@/db/vip-requests";
import { countPendingTestimonials } from "@/db/testimonials";
import { AdminAnalyticsSummary } from "@/views/admin/ui/sections/analytics-summary";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `Violetta — ${t("meta_title")}` };
}

// /admin is the only authenticated route — render it fresh per request
// so the gate picks up env-var changes (TELEGRAM_BOT_TOKEN being set or
// cleared) without a rebuild.
export const dynamic = "force-dynamic";

export default async function AdminRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  // Auth gate is only active when TELEGRAM_BOT_TOKEN is set. Local dev /
  // CI (no token) keep the admin page open so route-level tests can run
  // without secrets. The gate activates as soon as the env var is
  // populated in any environment.
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) {
      redirect({ href: "/sign-in", locale });
    }
  }

  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const tSignIn = await getTranslations("SignIn");

  const [bookings, pendingVip, pendingTestimonials] = await Promise.all([
    listBookingsForAdmin(),
    listPendingVipRequests(),
    countPendingTestimonials(),
  ]);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="pb-16">
      <AppHeader back="/home" title={t("plate_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("inbox_title")}
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          <li>
            <Link
              href="/admin/bookings"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">{t("inbox_bookings")}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {pendingBookings} {t("inbox_pending_suffix")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/vip-requests"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">{t("inbox_vip_requests")}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {pendingVip.length} {t("inbox_pending_suffix")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/testimonials"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">{t("inbox_testimonials")}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {pendingTestimonials} {t("inbox_pending_suffix")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/site-settings"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">{t("inbox_site_settings")}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {t("inbox_site_settings_caption")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/studio"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">{t("inbox_studio")}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {t("inbox_studio_caption")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/photos"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">{t("inbox_photos")}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {t("inbox_photos_caption")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/services"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">
                {t("inbox_services")}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {t("inbox_services_caption")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/masters"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">
                {t("inbox_masters")}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {t("inbox_masters_caption")}
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/users"
              className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
            >
              <div className="font-display text-[16px] italic">
                {t("inbox_users")}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
                {t("inbox_users_caption")}
              </div>
            </Link>
          </li>
        </ul>
      </section>

      <AdminAnalyticsSummary />

      {AUTH_REQUIRED ? (
        <section className="border-t-[0.5px] border-line px-[22px] pt-6">
          <SignOutButton label={tSignIn("cta_sign_out")} />
        </section>
      ) : null}
    </div>
  );
}
