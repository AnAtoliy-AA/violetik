import type { Locale } from "@/i18n/routing";
import type {
  GalleryCategoryView,
  GalleryData,
  GalleryItemView,
} from "../model/types";

/**
 * Self-contained snapshot of the legacy hardcoded gallery (the 5 tags + 8
 * demo tiles). Used as a graceful fallback when the DB is unavailable or
 * not yet seeded (CI, fresh installs), so the customer gallery never
 * renders blank — mirroring the seed shipped in migration 0021. Kept local
 * to this slice (no cross-slice import) so the fallback is independent.
 */
const LEGACY_CATEGORIES: ReadonlyArray<{
  id: string;
  en: string;
  ru: string;
  by: string;
}> = [
  { id: "editorial", en: "Editorial", ru: "Эдиториал", by: "Эдыторыял" },
  { id: "gel", en: "Gel", ru: "Гель", by: "Гель" },
  { id: "chrome", en: "Chrome", ru: "Хром", by: "Хром" },
  { id: "lace", en: "Lace", ru: "Кружево", by: "Карункі" },
  { id: "bridal", en: "Bridal", ru: "Свадебный", by: "Вясельны" },
];

const LEGACY_ITEMS: ReadonlyArray<{
  id: string;
  categoryId: string;
  palette: readonly [string, string];
  paletteDots: readonly string[];
  h: number;
}> = [
  { id: "g1", categoryId: "chrome", palette: ["#c9a96e", "#7d3a6f"], paletteDots: ["#c9a96e", "#a98850", "#7d3a6f", "#3a1a3a"], h: 220 },
  { id: "g2", categoryId: "editorial", palette: ["#d9a3b6", "#1a0f1f"], paletteDots: ["#d9a3b6", "#a55c7a", "#4a2a48", "#1a0f1f"], h: 280 },
  { id: "g3", categoryId: "gel", palette: ["#9d7bc7", "#3a2050"], paletteDots: ["#9d7bc7", "#6f4ea0", "#3a2050", "#1a1030"], h: 200 },
  { id: "g4", categoryId: "lace", palette: ["#f3ead8", "#7d3a6f"], paletteDots: ["#f3ead8", "#d4a9b8", "#a05080", "#7d3a6f"], h: 260 },
  { id: "g5", categoryId: "chrome", palette: ["#e8cf99", "#2a1a30"], paletteDots: ["#e8cf99", "#b69870", "#5a3848", "#2a1a30"], h: 240 },
  { id: "g6", categoryId: "editorial", palette: ["#7d3a6f", "#14091a"], paletteDots: ["#7d3a6f", "#4f234a", "#2a1530", "#14091a"], h: 300 },
  { id: "g7", categoryId: "bridal", palette: ["#f3ead8", "#d9a3b6"], paletteDots: ["#f3ead8", "#e5c7c4", "#d9a3b6", "#a06080"], h: 220 },
  { id: "g8", categoryId: "gel", palette: ["#9d7bc7", "#c9a96e"], paletteDots: ["#9d7bc7", "#b39ac9", "#d4b890", "#c9a96e"], h: 250 },
];

function name(
  c: (typeof LEGACY_CATEGORIES)[number],
  locale: Locale,
): string {
  if (locale === "ru") return c.ru;
  if (locale === "by") return c.by;
  return c.en;
}

/** Builds the legacy gallery resolved for `locale`. */
export function legacyGalleryData(locale: Locale): GalleryData {
  const categories: GalleryCategoryView[] = LEGACY_CATEGORIES.map((c) => ({
    id: c.id,
    name: name(c, locale),
  }));
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const items: GalleryItemView[] = LEGACY_ITEMS.map((it) => ({
    id: it.id,
    categoryId: it.categoryId,
    categoryName: nameById.get(it.categoryId) ?? it.categoryId,
    caption: null,
    palette: it.palette,
    paletteDots: it.paletteDots,
    h: it.h,
  }));
  return { categories, items };
}
