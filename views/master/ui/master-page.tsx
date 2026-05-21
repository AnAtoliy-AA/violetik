import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  STUDIO_DATA,
  type Artist,
  type Testimonial,
} from "@/entities/studio";
import { Aurora } from "@/shared/ui/aurora";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { AppHeader } from "@/widgets/app-header";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export interface MasterPageProps {
  /** Override the master record (with DB-loaded photo) at the route level. */
  artist?: Artist;
  /** Override the testimonials list (with DB-loaded avatars). */
  testimonials?: readonly Testimonial[];
}

export function MasterPage({
  artist: artistProp,
  testimonials: testimonialsProp,
}: MasterPageProps = {}) {
  const t = useTranslations("Master");
  const artist = artistProp ?? STUDIO_DATA.artist;
  const testimonials = testimonialsProp ?? STUDIO_DATA.testimonials;
  const [firstName, ...rest] = artist.name.split(" ");
  const lastName = rest.join(" ");

  const stats: readonly [string, string][] = [
    [String(artist.years), t("stat_years")],
    ["1", t("stat_chair")],
    ["600+", t("stat_sets")],
  ];

  return (
    <div className="pb-10">
      <AppHeader back="/home" title={t("plate_title")} />

      <div className="relative px-[22px]">
        <Aurora intensity="subtle" />
        <div className="gilded-lift glass-top relative aspect-[1/1.2] overflow-hidden rounded-[28px]">
          {artist.image ? (
            <Image
              src={artist.image.src}
              alt={artist.image.alt ?? artist.name}
              fill
              priority
              sizes="(max-width: 420px) 100vw, 420px"
              placeholder={artist.image.blurDataURL ? "blur" : undefined}
              blurDataURL={artist.image.blurDataURL}
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 65% 60% at 50% 35%, #f3ead8 0%, #c9a96e 30%, #7d3a6f 70%, #14091a 100%)",
              }}
            />
          )}
          <PaperGrain className="opacity-[0.06]" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 40%, color-mix(in oklab, var(--color-bg) 90%, transparent))",
            }}
          />
          <div className="absolute left-[18px] top-[18px]">
            <Eyebrow gold>{t("frame_mark")}</Eyebrow>
          </div>
          <div className="absolute inset-x-[18px] bottom-[18px]">
            <h1 className="m-0 font-display text-h1 font-light italic leading-[0.96] tracking-[-0.02em]">
              {firstName}
              <br />
              <span className="not-italic">{lastName}.</span>
            </h1>
          </div>
        </div>
      </div>

      <section className="px-[22px] pb-4 pt-[30px]">
        <Eyebrow gold>{artist.role.toUpperCase()}</Eyebrow>
        <LetterpressRule className="mt-3 max-w-[180px]" />
        <p className="dropcap m-0 mt-4 text-[15px] leading-[1.6] text-text-2">
          {artist.bio}
        </p>
      </section>

      <section className="px-[22px] pb-7 pt-2.5">
        <blockquote className="gilded glass-top relative m-0 overflow-hidden rounded-[28px] px-7 py-8">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1 select-none font-display text-[120px] font-light italic leading-none text-gold"
          >
            &ldquo;
          </span>
          <p className="m-0 pl-10 font-display text-[24px] font-normal italic leading-[1.3]">
            {artist.quote}
          </p>
        </blockquote>
      </section>

      <section className="px-[22px] pb-7">
        <LetterpressRule className="mb-5" />
        <div className="grid grid-cols-3">
          {stats.map(([n, label], i) => (
            <div
              key={label}
              className={`px-1 py-2 text-center ${
                i < stats.length - 1 ? "border-r-[0.5px] border-line" : ""
              }`}
            >
              <div className="font-display text-[40px] font-normal italic leading-none text-gold-shimmer">
                {n}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {label}
              </div>
            </div>
          ))}
        </div>
        <LetterpressRule className="mt-5" />
      </section>

      <section className="px-[22px] pb-7">
        <Eyebrow>{t("voices_eyebrow")}</Eyebrow>
        <div className="mt-4 flex flex-col gap-3.5">
          {testimonials.map((tm) => (
            <SpotlightCard key={tm.id} className="gilded glass-top rounded-[18px] p-[18px]">
              <p className="m-0 mb-3 font-display text-[18px] font-normal italic leading-[1.35]">
                &ldquo;{tm.text}&rdquo;
              </p>
              <LetterpressRule className="mb-3 max-w-[140px]" />
              <div className="flex items-center gap-2.5">
                {tm.avatar ? (
                  <span className="relative size-[22px] overflow-hidden rounded-full">
                    <Image
                      src={tm.avatar.src}
                      alt={tm.avatar.alt ?? tm.name}
                      fill
                      sizes="22px"
                      placeholder={tm.avatar.blurDataURL ? "blur" : undefined}
                      blurDataURL={tm.avatar.blurDataURL}
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="size-[22px] rounded-full"
                    style={{
                      background:
                        "color-mix(in oklab, var(--color-rose) 60%, var(--color-accent))",
                    }}
                  />
                )}
                <div className="text-[12px]">
                  <span className="font-medium">{tm.name}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                    {tm.role}
                  </span>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section className="px-[22px] pb-10">
        <MagneticButton className="block w-full">
          <Link
            href="/services"
            className={buttonClassName({
              variant: "gold",
              size: "lg",
              block: true,
              className: "gap-2",
            })}
          >
            {t("cta_reserve")} <ArrowRight />
          </Link>
        </MagneticButton>
      </section>
    </div>
  );
}
