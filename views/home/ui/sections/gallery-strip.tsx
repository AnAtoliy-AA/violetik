import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";

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

export function GalleryStrip() {
  const t = useTranslations("Home");
  const items = STUDIO_DATA.gallery.slice(0, 5);
  return (
    <section className="pb-7 pt-5">
      <div className="mb-3 flex items-end justify-between px-[22px]">
        <div>
          <Plate folio number={4} label={t("plate_portfolio").toUpperCase()} />
          <h2 className="mt-2 font-display text-[34px] font-normal italic leading-[1.05] tracking-[-0.02em]">
            {t("gallery_title_a")} <em>{t("gallery_title_b")}</em>.
          </h2>
        </div>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent"
        >
          {t("gallery_view_all")} <ArrowRight />
        </Link>
      </div>
      <LetterpressRule className="mx-[22px] mb-4" />
      <div className="scroll-x flex gap-3 overflow-x-auto px-[22px] pb-2 snap-x snap-mandatory">
        {items.map((g, i) => (
          <Link
            key={g.id}
            href="/gallery"
            className="gilded relative h-[220px] w-[150px] shrink-0 snap-start overflow-hidden rounded-[18px] shadow-[0_12px_28px_-16px_rgba(0,0,0,0.55)] transition-transform duration-fast ease-out hover:-rotate-[0.4deg] hover:scale-[1.01] motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100"
          >
            <NailTile
              palette={g.palette}
              variant={((i + 1) % 6) as NailTileVariant}
              className="size-full"
            />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(20,9,26,0.45)] px-2 py-[3px] font-display text-[12px] italic text-text backdrop-blur-md">
              Nº {String(i + 1).padStart(2, "0")}
            </span>
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(20,9,26,0.55)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text backdrop-blur-md">
              {g.tag}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
