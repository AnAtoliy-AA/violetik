import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { ProfileHero } from "./profile-hero";
import { UpcomingBookings } from "./upcoming-bookings";
import { BookingHistory } from "./booking-history";
import { TestimonialsSection } from "./testimonials-section";
import {
  BookingHistorySkeleton,
  ProfileHeroSkeleton,
  TestimonialsSectionSkeleton,
  UpcomingBookingsSkeleton,
} from "./profile-skeletons";

const QUICK_LINKS: ReadonlyArray<{ key: string; href: string }> = [
  { key: "bookings", href: "/booking/service" },
  { key: "membership", href: "/membership" },
  { key: "notifications", href: "/profile/notifications" },
  { key: "aftercare", href: "/services" },
  { key: "studio", href: "/master" },
];

export async function ProfilePage({ locale }: { locale: string }) {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/profile`);
  }

  const [t, tLinks] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Profile.quick_links"),
  ]);

  return (
    <div className="pb-28">
      <AppHeader title={t("plate_title")} />

      <Suspense fallback={<ProfileHeroSkeleton />}>
        <ProfileHero user={user} />
      </Suspense>

      <section className="px-[22px] pb-7">
        <Eyebrow>{t("upcoming_eyebrow")}</Eyebrow>
        <Suspense fallback={<UpcomingBookingsSkeleton />}>
          <UpcomingBookings userId={user.id} locale={locale} />
        </Suspense>
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
        <Suspense fallback={<BookingHistorySkeleton />}>
          <BookingHistory userId={user.id} locale={locale} />
        </Suspense>
      </section>

      <section className="px-[22px] pt-9">
        <Eyebrow>{t("testimonials_eyebrow")}</Eyebrow>
        <LetterpressRule className="mt-3" />
        <Suspense fallback={<TestimonialsSectionSkeleton />}>
          <TestimonialsSection userId={user.id} locale={locale} />
        </Suspense>
      </section>

      <TabBar showAdmin={user.role === "admin"} />
    </div>
  );
}
