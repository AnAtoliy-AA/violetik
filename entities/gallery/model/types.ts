import type { ImageAsset } from "@/entities/studio";

/**
 * A gallery category resolved for the active locale. The customer view
 * renders these as filter tabs; the admin sees the raw row instead.
 */
export interface GalleryCategoryView {
  id: string;
  /** Localized display name. */
  name: string;
}

/**
 * A gallery picture resolved for the active locale, shaped to feed the
 * existing `GalleryCard` / `GalleryLightbox` components. `palette` is the
 * 2-color gradient fallback used when `image` is absent.
 */
export interface GalleryItemView {
  id: string;
  categoryId: string;
  /** Localized category name — used as the card badge + lightbox label. */
  categoryName: string;
  /** Localized caption; null falls back to `categoryName` in the lightbox. */
  caption: string | null;
  palette: readonly [string, string];
  paletteDots?: ReadonlyArray<string>;
  /** Card pixel height for the masonry grid. */
  h: number;
  image?: ImageAsset;
}

export interface GalleryData {
  categories: GalleryCategoryView[];
  items: GalleryItemView[];
}
