import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA, type Visit } from "@/entities/studio";
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

function formatDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export async function ProfilePage() {
  const t = await getTranslations("Profile");
  const tCountdown = await getTranslations("Profile.countdown");
  const tLinks = await getTranslations("Profile.quick_links");
  const locale = await getLocale();

  const user = await getCurrentSessionUser();
  const tier = user ? await getCurrentTier(user.id) : { state: "member" as const };

  const { profile, visits, services } = STUDIO_DATA;
  const upcoming: Visit | undefined = visits.find(
    (v) => v.status === "upcoming",
  );
  const history = visits.filter((v) => v.status === "past");

  const serviceName = (id: string): string =>
    services.find((s) => s.id === id)?.name ?? id;

  const countdownLabel = (days: number): string => {
    if (days <= 0) return tCountdown("today");
    if (days === 1) return tCountdown("tomorrow");
    return tCountdown("in_days", { n: days });
  };

  return (
    <div className="pb-28">
      <AppHeader title={t("plate_title")} />

      <section className="relative overflow-hidden px-[22px] pt-4 pb-7">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <div className="relative z-10 flex items-center gap-4">
          <div
            aria-hidden
            className="gilded glass-top grid size-[68px] place-items-center rounded-full font-display text-[24px] italic text-bg"
            style={{
              background: `linear-gradient(135deg, ${profile.palette[0]}, ${profile.palette[1]})`,
            }}
          >
            {initialsOf(profile.name)}
          </div>
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
              {profile.name}
            </h1>
            <p className="mt-1.5 text-[12px] text-text-3">
              {t("joined", { year: profile.joined.toString() })}
            </p>
          </div>
        </div>
      </section>

      {upcoming ? (
        <section className="px-[22px] pb-7">
          <SpotlightCard
            as="article"
            aria-label={t("next_visit_eyebrow")}
            className="gilded-lift glass-top relative overflow-hidden rounded-[28px] px-5 py-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 opacity-60"
            >
              <NailFan palette={profile.palette} count={4} lift={4} />
            </div>
            <Eyebrow>{t("next_visit_eyebrow")}</Eyebrow>
            <p className="mt-3 font-display text-[26px] font-normal italic leading-tight">
              {serviceName(upcoming.serviceId)}
            </p>
            <p className="mt-1.5 text-[13px] text-text-2">
              {formatDate(upcoming.date, locale)} · {upcoming.time}
            </p>
            {upcoming.daysAway !== undefined ? (
              <span className="gilded mt-3.5 inline-flex rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
                {countdownLabel(upcoming.daysAway)}
              </span>
            ) : null}
          </SpotlightCard>
        </section>
      ) : null}

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
        <ul className="mt-3 divide-y divide-line">
          {history.map((visit) => (
            <li
              key={visit.id}
              className="flex items-baseline justify-between py-3.5"
            >
              <div>
                <p className="font-display text-[19px] font-normal italic leading-tight">
                  {serviceName(visit.serviceId)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                  {formatDate(visit.date, locale)} · {visit.time}
                </p>
              </div>
              <span className="font-display text-[20px] italic text-gold-shimmer">
                €{visit.price}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <TabBar />
    </div>
  );
}
