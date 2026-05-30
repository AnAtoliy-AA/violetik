import { listAllServices } from "@/db/services";
import { listAllMasters } from "@/db/masters";
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
 * even before anything is uploaded. Service slots are sourced from the
 * DB; the rest still come from STUDIO_DATA (gallery / atelier / master /
 * profile are not part of the Phase 1 migration).
 */
export async function listAllPhotoSlots(): Promise<PhotoSlot[]> {
  const slots: PhotoSlot[] = [];
  const services = await listAllServices();
  for (const s of services) {
    slots.push({
      kind: "service",
      id: s.id,
      label: s.nameEn,
      hint: "5:6 portrait · doubles as thumb + detail hero",
    });
  }
  // Gallery photos moved to their own admin (`/admin/gallery`) backed by a
  // dedicated gallery_items table; they're no longer managed as fixed
  // studio_photos slots here.
  for (const clip of STUDIO_DATA.atelierClips) {
    slots.push({
      kind: "atelier",
      id: clip.key,
      label: `Atelier · ${clip.key}`,
      hint: "3:4 poster frame for the clip",
    });
  }
  const masters = await listAllMasters();
  for (const m of masters) {
    slots.push({
      kind: "master",
      id: m.id,
      label: m.nameEn,
      hint: "1:1.2 portrait — master page hero",
    });
  }
  slots.push({
    kind: "profile",
    id: STUDIO_DATA.profile.name.toLowerCase().replace(/\s+/g, "-"),
    label: `${STUDIO_DATA.profile.name} · profile avatar`,
    hint: "1:1 · 68px disc",
  });
  return slots;
}
