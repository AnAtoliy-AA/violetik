import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Service } from "@/entities/service";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { SpotlightCard } from "@/shared/ui/spotlight-card";

export interface PairsWellWithProps {
  pairs: readonly Service[];
}

const TILE_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function PairsWellWith({ pairs }: PairsWellWithProps) {
  const t = useTranslations("ServiceDetail");
  if (pairs.length === 0) return null;
  return (
    <section className="px-[22px] py-7">
      <Eyebrow>{t("pairs_eyebrow")}</Eyebrow>
      <LetterpressRule className="mt-3" />
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {pairs.map((p, i) => (
          <SpotlightCard key={p.id} className="rounded-[14px]">
            <Link
              href={`/services/${encodeURIComponent(p.id)}`}
              className="block no-underline"
            >
              <div className="gilded h-[120px] overflow-hidden rounded-[14px]">
                <NailTile
                  palette={TILE_PALETTE}
                  variant={((p.sortOrder + i) % 6) as NailTileVariant}
                  image={p.image}
                  imageSizes="(max-width: 420px) 33vw, 140px"
                  className="size-full"
                />
              </div>
              <div className="mt-2 pl-0.5">
                <div className="font-mono text-[8.5px] uppercase tracking-[0.32em] text-text-3">
                  {p.duration}
                </div>
                <div className="mt-1 truncate font-display text-[14px] italic text-text">
                  {p.name}
                </div>
              </div>
            </Link>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}
