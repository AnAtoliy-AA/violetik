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
        className="mt-3.5 flex w-full items-center gap-[18px] overflow-hidden rounded-[28px] border-[0.5px] border-line bg-[linear-gradient(120deg,var(--color-surface),var(--color-surface-2))] p-[18px] text-left text-text"
      >
        <div
          aria-hidden
          className="relative size-[72px] shrink-0 overflow-hidden rounded-full border-[0.5px] border-accent"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #f3ead8 0%, #c9a96e 40%, #7d3a6f 100%)",
          }}
        >
          <span
            className="absolute inset-1.5 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.4), transparent 60%)",
            }}
          />
        </div>
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
