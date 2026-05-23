import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadProfileWithPhoto } from "@/entities/studio/api/load-with-photos";
import { listAllServices } from "@/db/services";
import { listUserBookings } from "@/db/bookings";
import { listUserTestimonials } from "@/db/testimonials";
import { listPublishedMasters } from "@/db/masters";
import { getSiteSettings } from "@/db/site-settings";
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
import {
  submitTestimonialAction,
  TestimonialForm,
  MyTestimonialsList,
} from "@/features/testimonial-submit";
import { Aurora } from "@/shared/ui/aurora";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailFan } from "@/shared/ui/nail-fan";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";

const QUICK_LINKS: ReadonlyArray<{ key: string; href: string }> = [
  { key: "bookings", href: "/booking/service" },
  { key: "membership", href: "/membership" },
  { key: "aftercare", href: "/services" },
  { key: "studio", href: "/master" },
];

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("");
}

export async function ProfilePage({ locale }: { locale: string }) {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/profile`);
  }

  const [
    t,
    tLinks,
    profile,
    services,
    bookings,
    testimonials,
    publishedMasters,
    settings,
    tier,
  ] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Profile.quick_links"),
    loadProfileWithPhoto(),
    listAllServices(),
    listUserBookings(user.id),
    listUserTestimonials(user.id),
    listPublishedMasters(),
    getSiteSettings(),
    getCurrentTier(user.id),
  ]);

  const now = new Date();
  const { upcoming, history } = bucketBookings(bookings, now);
  const next = upcoming[0];
  const otherUpcoming = upcoming.slice(1);
  const completedHistory = history.slice(0, 20);

  const serviceName = (id: string): string => {
    const s = services.find((row) => row.id === id);
    if (!s) return id;
    return locale === "ru" ? s.nameRu : locale === "be" ? s.nameBe : s.nameEn;
  };

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    profile.name;
  const joinedYear = user.createdAt
    ? new Date(user.createdAt).getUTCFullYear()
    : new Date().getUTCFullYear();

  const studioTelegram = settings.telegramUsername ?? null;

  const masterNameInLocale = (row: UserBookingRow): string | null => {
    if (locale === "ru") return row.masterNameRu;
    if (locale === "be") return row.masterNameBe;
    return row.masterNameEn;
  };

  const renderAction = (row: UserBookingRow) => {
    if (canSelfCancel(now, row.scheduledFor)) {
      return (
        <CancelBookingButton
          bookingId={row.id}
          action={cancelBookingAction}
        />
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

  const masterNameById = Object.fromEntries(
    publishedMasters.map((m) => {
      const name =
        locale === "ru" ? m.nameRu : locale === "be" ? m.nameBe : m.nameEn;
      return [m.id, name];
    }),
  );
  const formMasters = publishedMasters.map((m) => ({
    id: m.id,
    name:
      locale === "ru" ? m.nameRu : locale === "be" ? m.nameBe : m.nameEn,
  }));

  return (
    <div className="pb-28">
      <AppHeader title={t("plate_title")} />

      <section className="relative overflow-hidden px-[22px] pt-4 pb-7">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <div className="relative z-10 flex items-center gap-4">
          {profile.avatar ? (
            <div className="gilded glass-top relative size-[68px] overflow-hidden rounded-full">
              <Image
                src={profile.avatar.src}
                alt={profile.avatar.alt ?? displayName}
                fill
                sizes="68px"
                placeholder={profile.avatar.blurDataURL ? "blur" : undefined}
                blurDataURL={profile.avatar.blurDataURL}
                className="object-cover"
              />
            </div>
          ) : (
            <div
              aria-hidden
              className="gilded glass-top grid size-[68px] place-items-center rounded-full font-display text-[24px] italic text-bg"
              style={{
                background: `linear-gradient(135deg, ${profile.palette[0]}, ${profile.palette[1]})`,
              }}
            >
              {initialsOf(displayName)}
            </div>
          )}
          <div>
            {tier.state === "vip" && (
              <span className="gilded inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                {t("badge_vip")}
              </span>
            )}
            {tier.state === "member-pending" && (
              <span className="rounded-full border-[0.5px] border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-2">
                {t("badge_pending_vip")}
              </span>
            )}
            <h1 className="mt-1.5 font-display text-[40px] font-light italic leading-none tracking-[-0.025em]">
              {displayName}
            </h1>
            <p className="mt-1.5 text-[12px] text-text-3">
              {t("joined", { year: joinedYear.toString() })}
            </p>
          </div>
        </div>
      </section>

      <section className="px-[22px] pb-7">
        <Eyebrow>{t("upcoming_eyebrow")}</Eyebrow>
        {next ? (
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
        ) : (
          <p className="mt-3 text-[13px] text-text-3">{t("upcoming_empty")}</p>
        )}
      </section>

      <nav aria-label={t("quick_links_aria")} className="px-[22px]">
        <LetterpressRule />
        <ul className="divide-y divide-line">
          {QUICK_LINKS.map((row) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className="flex items-center justify-between py-4 text-[14px] text-text transition-colors duration-fast ease-out hover:text-accent"
              >
                <span>{tLinks(row.key)}</span>
                <span aria-hidden className="text-text-3">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <LetterpressRule />
      </nav>

      <section className="px-[22px] pt-9">
        <Eyebrow>{t("history_eyebrow")}</Eyebrow>
        <LetterpressRule className="mt-3" />
        {completedHistory.length === 0 ? (
          <p className="mt-3 text-[13px] text-text-3">{t("history_empty")}</p>
        ) : (
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
        )}
      </section>

      <section className="px-[22px] pt-9">
        <Eyebrow>{t("testimonials_eyebrow")}</Eyebrow>
        <LetterpressRule className="mt-3" />
        <div className="mt-4">
          <TestimonialForm
            masters={formMasters}
            action={submitTestimonialAction}
          />
        </div>
        <div className="mt-6">
          <MyTestimonialsList
            rows={testimonials}
            masterNameById={masterNameById}
          />
        </div>
      </section>

      <TabBar />
    </div>
  );
}
