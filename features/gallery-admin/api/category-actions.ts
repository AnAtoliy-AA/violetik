"use server";

import { galleryCategoryFormSchema } from "@/entities/gallery";
import {
  createGalleryCategory,
  updateGalleryCategory,
  deleteGalleryCategory,
  reorderGalleryCategories,
  countGalleryItemsInCategory,
} from "@/db/gallery-mutations";
import {
  gateAdmin,
  joinIssues,
  revalidateGallery,
  type ActionResult,
} from "./_common";

export async function createGalleryCategoryAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = galleryCategoryFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const result = await createGalleryCategory({
    ...parsed.data,
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGallery();
  return { ok: true };
}

export async function updateGalleryCategoryAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = galleryCategoryFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const { id, ...patch } = parsed.data;
  const result = await updateGalleryCategory(id, {
    ...patch,
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGallery();
  return { ok: true };
}

export type DeleteGalleryCategoryResult =
  | { ok: true }
  | { ok: false; error: string; blockingItemCount?: number };

/**
 * Hard-deletes a category, but refuses while it still holds pictures — the
 * admin must move/remove them first (FK `restrict` is the backstop).
 */
export async function deleteGalleryCategoryAction(
  id: string,
): Promise<DeleteGalleryCategoryResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const blockingItemCount = await countGalleryItemsInCategory(id);
  if (blockingItemCount > 0) {
    return { ok: false, error: "category_has_items", blockingItemCount };
  }

  const result = await deleteGalleryCategory(id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGallery();
  return { ok: true };
}

export async function reorderGalleryCategoriesAction(
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

  const result = await reorderGalleryCategories(orderedIds);
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGallery();
  return { ok: true };
}
