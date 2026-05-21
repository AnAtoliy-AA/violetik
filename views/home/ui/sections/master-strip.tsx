import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA } from "@/entities/studio";
import { Plate } from "@/shared/ui/plate";

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

export function MasterStrip() {
  const t = useTranslations("Home");
  const { artist } = STUDIO_DATA;
  return (
    <section className="px-[22px] pb-4 pt-7">
      <Plate number={2} label={t("plate_master").toUpperCase()} />
      <Link
        href="/master"
        className="gilded glass-top mt-3.5 flex w-full items-center gap-[18px] overflow-hidden rounded-[28px] p-[18px] text-left text-text"
      >
        <span
          aria-hidden
          className="relative inline-flex size-[72px] shrink-0 items-center justify-center rounded-full border border-accent/60 p-[6px]"
        >
          <span
            className="block size-full rounded-full border border-accent/40"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #f3ead8 0%, var(--color-accent) 45%, var(--color-plum) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.35)",
            }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-accent">
            {t("master_stat")}
          </div>
          <div className="mt-1.5 font-display text-[24px] italic">
            {artist.name}
          </div>
          <p className="mt-1.5 text-xs italic leading-[1.5] text-text-2">
            &ldquo;{artist.quote}&rdquo;
          </p>
        </div>
        <ArrowRight />
      </Link>
    </section>
  );
}
