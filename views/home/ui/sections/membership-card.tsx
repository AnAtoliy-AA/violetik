import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
        className="relative block w-full overflow-hidden rounded-[28px] border-[0.5px] px-[26px] py-8 text-left text-text"
        style={{
          background:
            "linear-gradient(140deg, #2a1632 0%, #1a0f1f 60%, #1a0f1f 100%)",
          borderColor: "color-mix(in oklab, var(--color-accent) 40%, transparent)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[50px] -top-[50px] size-[220px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 28%, transparent), transparent 70%)",
          }}
        />
        <Plate number={5} label={t("plate_invitation").toUpperCase()} />
        <h3 className="my-3 font-display text-[32px] font-normal italic leading-tight tracking-[-0.01em]">
          {t("membership_title_lead")}{" "}
          <span className="text-gold-shimmer">{t("membership_title_word")}</span>.
        </h3>
        <p className="m-0 max-w-[300px] text-[13.5px] leading-[1.55] text-text-2">
          {t("membership_blurb")}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          {t("membership_link")} <ArrowRight />
        </div>
      </Link>
    </section>
  );
}
