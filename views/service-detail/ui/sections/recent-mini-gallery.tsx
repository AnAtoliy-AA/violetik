import { useTranslations } from "next-intl";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import type { GalleryItem } from "@/entities/studio";

export interface RecentMiniGalleryProps {
  items: readonly GalleryItem[];
}

export function RecentMiniGallery({ items }: RecentMiniGalleryProps) {
  const t = useTranslations("ServiceDetail");
  return (
    <section className="px-[22px] py-7">
      <Eyebrow>{t("recent_eyebrow")}</Eyebrow>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map((g, i) => (
          <div
            key={g.id}
            className="h-[130px] overflow-hidden rounded-[10px] border-[0.5px] border-line"
          >
            <NailTile
              palette={g.palette}
              variant={((i + 2) % 6) as NailTileVariant}
              className="size-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
