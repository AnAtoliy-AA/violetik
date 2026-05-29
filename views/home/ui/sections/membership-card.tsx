import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { Plate } from "@/shared/ui/plate";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function MembershipCard() {
  const t = useTranslations("Home");
  return (
    <section className="px-[22px] pb-7 pt-2.5">
      <Link
        href="/membership"
        className="gilded-lift glass-top relative block w-full overflow-hidden rounded-[28px] px-[26px] py-8 text-left text-text"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[50px] -top-[50px] size-[220px] rounded-full motion-safe:[animation:sealRotate_60s_linear_infinite]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 28%, transparent), transparent 70%)",
          }}
        />
        <div className="absolute right-5 top-5">
          <MonogramSeal letter="V" />
        </div>
        <Plate folio number={6} label={t("plate_invitation").toUpperCase()} />
        <h3 className="my-3 font-display text-[32px] font-normal italic leading-tight tracking-[-0.01em]">
          {t("membership_title_lead")}{" "}
          <span className="text-gold-shimmer">{t("membership_title_word")}</span>.
        </h3>
        <p className="dropcap m-0 max-w-[300px] text-[13.5px] leading-[1.55] text-text-2">
          {t("membership_blurb")}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          {t("membership_link")} <ArrowRight />
        </div>
      </Link>
    </section>
  );
}
