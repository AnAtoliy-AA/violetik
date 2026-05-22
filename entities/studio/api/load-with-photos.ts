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
  Testimonial,
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

/** Returns the gallery list with `image` populated. */
export async function loadGalleryWithPhotos(): Promise<GalleryItem[]> {
  const photos = await imagesByKind("gallery");
  return STUDIO_DATA.gallery.map((g) => ({
    ...g,
    image: photos.get(g.id) ?? g.image,
  }));
}

/** Returns the testimonials list with `avatar` populated. */
export async function loadTestimonialsWithPhotos(): Promise<Testimonial[]> {
  const photos = await imagesByKind("testimonial");
  return STUDIO_DATA.testimonials.map((t) => ({
    ...t,
    avatar: photos.get(t.id) ?? t.avatar,
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
