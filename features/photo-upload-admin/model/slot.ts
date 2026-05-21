import { STUDIO_DATA } from "@/entities/studio";
import type { PhotoSlotKind } from "@/db/schema";

export type PhotoSlotId = string;

export interface PhotoSlot {
  kind: PhotoSlotKind;
  id: PhotoSlotId;
  /** Human-readable label for the admin UI. */
  label: string;
  /** Recommended aspect ratio for the photographer (free text). */
  hint: string;
}

/**
 * Every (kind, id) the customer pages render — keeps the admin UI as a
 * fixed roster instead of derived strings, so the page lists every slot
 * even before anything is uploaded.
 */
export function listAllPhotoSlots(): PhotoSlot[] {
  const slots: PhotoSlot[] = [];

  // Services: one slot per ritual (hero + thumbnail share the same photo).
  for (const s of STUDIO_DATA.services) {
    slots.push({
      kind: "service",
      id: s.id,
      label: s.name,
      hint: "5:6 portrait · doubles as thumb + detail hero",
    });
  }

  // Gallery items.
  for (const g of STUDIO_DATA.gallery) {
    slots.push({
      kind: "gallery",
      id: g.id,
      label: `${g.tag} · ${g.id}`,
      hint: "natural ratio · grid + lightbox",
    });
  }

  // Testimonials avatar.
  for (const t of STUDIO_DATA.testimonials) {
    slots.push({
      kind: "testimonial",
      id: t.id,
      label: `${t.name} · ${t.role}`,
      hint: "1:1 · 22px disc",
    });
  }

  // Atelier-motion poster frames. (Video footage is wired separately.)
  for (const clip of STUDIO_DATA.atelierClips) {
    slots.push({
      kind: "atelier",
      id: clip.key,
      label: `Atelier · ${clip.key}`,
      hint: "3:4 poster frame for the clip",
    });
  }

  // Master portrait.
  slots.push({
    kind: "master",
    id: "violetta",
    label: STUDIO_DATA.artist.name,
    hint: "1:1.2 portrait — master page hero",
  });

  // Customer profile avatar.
  slots.push({
    kind: "profile",
    id: STUDIO_DATA.profile.name.toLowerCase().replace(/\s+/g, "-"),
    label: `${STUDIO_DATA.profile.name} · profile avatar`,
    hint: "1:1 · 68px disc",
  });

  return slots;
}
