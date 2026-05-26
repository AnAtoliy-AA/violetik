// Loaders here import @/db/* which depends on `postgres`. Keep this module
// out of any client component or storybook story import graph — route files
// and server components only. The entities/studio barrel re-exports types
// only; these loader functions are reached via a deeper path import.
import { STUDIO_DATA } from "../model/data";
import type {
  AtelierClip,
  CustomerProfile,
  GalleryItem,
  ImageAsset,
} from "../model/types";
import { getStudioPhoto, getStudioPhotos } from "@/db/studio-photos";
import type { PhotoSlotKind } from "@/db/schema";

async function imagesByKind(
  kind: PhotoSlotKind,
): Promise<Map<string, ImageAsset>> {
  const rows = await getStudioPhotos(kind);
  const map = new Map<string, ImageAsset>();
  for (const r of rows) map.set(r.slotId, r.image);
  return map;
}

async function palettesByKind(
  kind: PhotoSlotKind,
): Promise<Map<string, string[]>> {
  const rows = await getStudioPhotos(kind);
  const map = new Map<string, string[]>();
  for (const r of rows) {
    if (r.palette && r.palette.length > 0) map.set(r.slotId, r.palette);
  }
  return map;
}

/** Returns the gallery list with `image` + `paletteDots` populated. */
export async function loadGalleryWithPhotos(): Promise<GalleryItem[]> {
  const [photos, palettes] = await Promise.all([
    imagesByKind("gallery"),
    palettesByKind("gallery"),
  ]);
  return STUDIO_DATA.gallery.map((g) => ({
    ...g,
    image: photos.get(g.id) ?? g.image,
    // §9.3 — prefer the sharp-extracted palette from the uploaded photo;
    // fall back to the hand-tuned `paletteDots` constant which we
    // shipped earlier so the gallery never renders dot-less.
    paletteDots: palettes.get(g.id) ?? g.paletteDots,
  }));
}

/** Returns the atelier-motion clips with poster frames populated. */
export async function loadAtelierClipsWithPhotos(): Promise<AtelierClip[]> {
  const photos = await imagesByKind("atelier");
  return STUDIO_DATA.atelierClips.map((clip) => {
    const poster = photos.get(clip.key);
    if (!poster) return clip;
    return {
      ...clip,
      video: clip.video
        ? { ...clip.video, posterSrc: poster.src }
        : { src: "", posterSrc: poster.src, alt: poster.alt },
    };
  });
}

/** Returns the demo customer profile with `avatar` populated. */
export async function loadProfileWithPhoto(): Promise<CustomerProfile> {
  const slotId = STUDIO_DATA.profile.name.toLowerCase().replace(/\s+/g, "-");
  const photo = await getStudioPhoto("profile", slotId);
  return {
    ...STUDIO_DATA.profile,
    avatar: photo?.image ?? STUDIO_DATA.profile.avatar,
  };
}
