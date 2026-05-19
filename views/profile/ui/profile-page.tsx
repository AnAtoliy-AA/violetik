"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA, type Visit } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { NailFan } from "@/shared/ui/nail-fan";
import { AppHeader } from "@/widgets/app-header";

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

export function ProfilePage() {
  const t = useTranslations("Profile");
  const tCountdown = useTranslations("Profile.countdown");
  const tLinks = useTranslations("Profile.quick_links");
  const locale = useLocale();

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
    <div className="pb-10">
      <AppHeader title={t("plate_title")} />

      <section className="px-[22px] pt-4 pb-7">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="grid size-[68px] place-items-center rounded-full font-display text-[24px] italic text-bg"
            style={{
              background: `linear-gradient(135deg, ${profile.palette[0]}, ${profile.palette[1]})`,
            }}
          >
            {initialsOf(profile.name)}
          </div>
          <div>
            {profile.membership ? (
              <Eyebrow gold>
                {t("member_tag", { tier: profile.membership })}
              </Eyebrow>
            ) : null}
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
          <article
            aria-label={t("next_visit_eyebrow")}
            className="relative overflow-hidden rounded-[28px] border-[0.5px] border-line-strong bg-surface px-5 py-5"
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
              <span className="mt-3.5 inline-flex rounded-full border-[0.5px] border-line-strong px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
                {countdownLabel(upcoming.daysAway)}
              </span>
            ) : null}
          </article>
        </section>
      ) : null}

      <nav aria-label={t("quick_links_aria")} className="px-[22px]">
        <ul className="divide-y divide-line border-y-[0.5px] border-line">
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
      </nav>

      <section className="px-[22px] pt-9">
        <Eyebrow>{t("history_eyebrow")}</Eyebrow>
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
              <span className="font-display text-[20px] italic text-gold">
                €{visit.price}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
