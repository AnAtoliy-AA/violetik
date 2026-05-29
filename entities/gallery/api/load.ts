// Server-only: imports @/db/*. Not re-exported from the slice barrel so
// client components / stories never pull the DB into their bundle.
import { listGalleryCategories, listGalleryItems } from "@/db/gallery";
import { pickLocalizedName, pickLocalizedCaption } from "../lib/pick-localized";
import type {
  GalleryCategoryView,
  GalleryData,
  GalleryItemView,
} from "../model/types";
import type { GalleryItemRow } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

const DEFAULT_PALETTE: readonly [string, string] = ["#7d3a6f", "#14091a"];
// Heights cycle so the DB-backed grid keeps the legacy masonry variety when
// rows carry no intrinsic image dimensions.
const HEIGHT_CYCLE = [220, 280, 200, 260, 240, 300, 220, 250] as const;

function paletteTuple(p: string[] | null): readonly [string, string] {
  if (p && p.length >= 2) return [p[0]!, p[1]!];
  if (p && p.length === 1) return [p[0]!, DEFAULT_PALETTE[1]];
  return DEFAULT_PALETTE;
}

function deriveHeight(row: GalleryItemRow, index: number): number {
  if (row.width && row.height && row.width > 0) {
    const ratio = row.height / row.width;
    return Math.round(Math.min(320, Math.max(180, 240 * ratio)));
  }
  return HEIGHT_CYCLE[index % HEIGHT_CYCLE.length]!;
}

/**
 * Loads the gallery (categories + items) resolved for `locale`, shaped to
 * feed the existing gallery view. Degrades to empty collections when the DB
 * is unavailable (the view renders its empty state).
 */
export async function loadGallery(locale: Locale): Promise<GalleryData> {
  const [categoryRows, itemRows] = await Promise.all([
    listGalleryCategories(),
    listGalleryItems(),
  ]);

  const categories: GalleryCategoryView[] = categoryRows.map((c) => ({
    id: c.id,
    name: pickLocalizedName(c, locale),
  }));
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  const items: GalleryItemView[] = itemRows.map((row, index) => ({
    id: row.id,
    categoryId: row.categoryId,
    categoryName: nameById.get(row.categoryId) ?? row.categoryId,
    caption: pickLocalizedCaption(row, locale),
    palette: paletteTuple(row.palette),
    paletteDots: row.palette ?? undefined,
    h: deriveHeight(row, index),
    image: row.src
      ? {
          src: row.src,
          alt: row.alt ?? undefined,
          width: row.width ?? undefined,
          height: row.height ?? undefined,
          blurDataURL: row.blurDataUrl ?? undefined,
        }
      : undefined,
  }));

  return { categories, items };
}
