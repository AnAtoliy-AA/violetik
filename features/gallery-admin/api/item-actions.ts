"use server";

import { galleryItemFormSchema } from "@/entities/gallery";
import type { GalleryItemFormInput } from "@/entities/gallery";
import {
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  reorderGalleryItems,
} from "@/db/gallery-mutations";
import { getGalleryItemById } from "@/db/gallery";
import { deletePhotoFromStorage } from "@/shared/lib/photo-storage";
import {
  gateAdmin,
  joinIssues,
  revalidateGallery,
  type ActionResult,
} from "./_common";

/**
 * Best-effort 4-color palette extraction from the uploaded blob, matching
 * the studio-photo upload flow. Failure returns null and the row stores no
 * palette (the view falls back to a default gradient).
 */
async function paletteFor(src: string | undefined): Promise<string[] | null> {
  if (!src) return null;
  try {
    const { extractPaletteFromUrl } = await import(
      "@/shared/lib/photo-storage/extract-palette"
    );
    return await extractPaletteFromUrl(src, { count: 4 });
  } catch {
    return null;
  }
}

function toRow(data: GalleryItemFormInput, palette: string[] | null) {
  return {
    captionEn: data.captionEn ?? null,
    captionRu: data.captionRu ?? null,
    captionBy: data.captionBy ?? null,
    alt: data.alt ?? null,
    src: data.src ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    palette,
    sortOrder: data.sortOrder,
  };
}

export async function createGalleryItemAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = galleryItemFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const palette = await paletteFor(parsed.data.src);
  const result = await createGalleryItem({
    id: parsed.data.id,
    categoryId: parsed.data.categoryId,
    ...toRow(parsed.data, palette),
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGallery();
  return { ok: true };
}

export async function updateGalleryItemAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = galleryItemFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const existing = await getGalleryItemById(parsed.data.id);
  // Only re-extract the palette when the image actually changed.
  const imageChanged = (existing?.src ?? null) !== (parsed.data.src ?? null);
  const palette = imageChanged
    ? await paletteFor(parsed.data.src)
    : (existing?.palette ?? null);

  const result = await updateGalleryItem(parsed.data.id, {
    categoryId: parsed.data.categoryId,
    ...toRow(parsed.data, palette),
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  // Purge the displaced blob once the row no longer references it.
  if (imageChanged && existing?.src) {
    await deletePhotoFromStorage(existing.src);
  }

  revalidateGallery();
  return { ok: true };
}

export async function deleteGalleryItemAction(
  id: string,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const result = await deleteGalleryItem(id);
  if (result === null) return { ok: false, error: "db_unavailable" };
  if (result.deletedSrc) await deletePhotoFromStorage(result.deletedSrc);

  revalidateGallery();
  return { ok: true };
}

export async function reorderGalleryItemsAction(
  orderedIds: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (
    !Array.isArray(orderedIds) ||
    !orderedIds.every((x) => typeof x === "string" && x.length > 0)
  ) {
    return { ok: false, error: "invalid_order" };
  }

  const result = await reorderGalleryItems(orderedIds);
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGallery();
  return { ok: true };
}
