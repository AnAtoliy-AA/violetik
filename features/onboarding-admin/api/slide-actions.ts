"use server";

import {
  onboardingSlideFormSchema,
  type OnboardingSlideFormInput,
} from "@/entities/onboarding";
import {
  createOnboardingSlide,
  updateOnboardingSlide,
  deleteOnboardingSlide,
  reorderOnboardingSlides,
} from "@/db/onboarding-mutations";
import { getOnboardingSlideById } from "@/db/onboarding";
import { deletePhotoFromStorage } from "@/shared/lib/photo-storage";
import {
  gateAdmin,
  joinIssues,
  revalidateOnboarding,
  type ActionResult,
} from "./_common";

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

function toRow(data: OnboardingSlideFormInput, palette: string[] | null) {
  return {
    eyebrowEn: data.eyebrowEn,
    eyebrowRu: data.eyebrowRu,
    eyebrowBy: data.eyebrowBy,
    titleEn: data.titleEn,
    titleRu: data.titleRu,
    titleBy: data.titleBy,
    bodyEn: data.bodyEn,
    bodyRu: data.bodyRu,
    bodyBy: data.bodyBy,
    src: data.src ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    palette,
    variant: data.variant ?? 1,
    sortOrder: data.sortOrder,
  };
}

export async function createOnboardingSlideAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = onboardingSlideFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const palette = await paletteFor(parsed.data.src);
  const result = await createOnboardingSlide({
    id: parsed.data.id,
    ...toRow(parsed.data, palette),
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateOnboarding();
  return { ok: true };
}

export async function updateOnboardingSlideAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = onboardingSlideFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const existing = await getOnboardingSlideById(parsed.data.id);
  const imageChanged = (existing?.src ?? null) !== (parsed.data.src ?? null);
  const palette = imageChanged
    ? await paletteFor(parsed.data.src)
    : (existing?.palette ?? null);

  const result = await updateOnboardingSlide(parsed.data.id, {
    ...toRow(parsed.data, palette),
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  if (imageChanged && existing?.src) {
    await deletePhotoFromStorage(existing.src);
  }

  revalidateOnboarding();
  return { ok: true };
}

export async function deleteOnboardingSlideAction(
  id: string,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const result = await deleteOnboardingSlide(id);
  if (result === null) return { ok: false, error: "db_unavailable" };
  if (result.deletedSrc) await deletePhotoFromStorage(result.deletedSrc);

  revalidateOnboarding();
  return { ok: true };
}

export async function reorderOnboardingSlidesAction(
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

  const result = await reorderOnboardingSlides(orderedIds);
  if (!result.ok) return { ok: false, error: result.error };

  revalidateOnboarding();
  return { ok: true };
}
