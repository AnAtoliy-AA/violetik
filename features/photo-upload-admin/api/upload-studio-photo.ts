"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  uploadPhotoToStorage,
  deletePhotoFromStorage,
  type PhotoUploadError,
} from "@/shared/lib/photo-storage";
import {
  upsertStudioPhoto,
  deleteStudioPhoto,
} from "@/db/studio-photos";
import type { PhotoSlotKind } from "@/db/schema";

const slotKindSchema = z.enum([
  "service",
  "gallery",
  "atelier",
  "master",
  "testimonial",
  "profile",
]);

const intInRange = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).optional().nullable();

const uploadSchema = z.object({
  slotKind: slotKindSchema,
  slotId: z.string().min(1).max(64),
  alt: z.string().trim().min(1, "alt_required").max(280),
  width: intInRange(0, 12_000),
  height: intInRange(0, 12_000),
});

export type UploadStudioPhotoResult =
  | { ok: true; src: string }
  | {
      ok: false;
      error: PhotoUploadError | "auth" | "validation";
      /** Underlying provider message — shown alongside the translated error. */
      detail?: string;
    };

/**
 * Server action that powers `/admin/photos`. Auth-gates, validates the
 * form, uploads to Vercel Blob, upserts the DB row, deletes any stale
 * blob the upsert displaced, and revalidates the customer routes that
 * render that slot.
 *
 * Auth is enforced only when TELEGRAM_BOT_TOKEN is configured — mirrors
 * the existing pattern in update-site-settings.ts so CI / local dev
 * without auth secrets keeps working.
 */
export async function uploadStudioPhotoAction(
  _prev: UploadStudioPhotoResult | null,
  formData: FormData,
): Promise<UploadStudioPhotoResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  let uploadedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: "auth" };
    uploadedBy = gate.user.id;
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "validation" };
  }

  const parsed = uploadSchema.safeParse({
    slotKind: formData.get("slotKind"),
    slotId: formData.get("slotId"),
    alt: formData.get("alt"),
    width: formData.get("width") || null,
    height: formData.get("height") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const uploaded = await uploadPhotoToStorage({
    slotKind: parsed.data.slotKind,
    slotId: parsed.data.slotId,
    file,
  });
  if (!uploaded.ok) {
    return {
      ok: false,
      error: uploaded.error,
      detail: uploaded.detail?.message,
    };
  }

  const upsert = await upsertStudioPhoto({
    slotKind: parsed.data.slotKind,
    slotId: parsed.data.slotId,
    src: uploaded.value.src,
    alt: parsed.data.alt,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
    uploadedBy,
  });

  // Clean up the replaced blob, if any. Best-effort — a stale orphan blob
  // doesn't break the new render.
  if (upsert?.previousSrc && upsert.previousSrc !== uploaded.value.src) {
    await deletePhotoFromStorage(upsert.previousSrc);
  }

  revalidateForSlot(parsed.data.slotKind);
  return { ok: true, src: uploaded.value.src };
}

const deleteSchema = z.object({
  slotKind: slotKindSchema,
  slotId: z.string().min(1).max(64),
});

export type DeleteStudioPhotoResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" };

export async function deleteStudioPhotoAction(
  _prev: DeleteStudioPhotoResult | null,
  formData: FormData,
): Promise<DeleteStudioPhotoResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: "auth" };
  }

  const parsed = deleteSchema.safeParse({
    slotKind: formData.get("slotKind"),
    slotId: formData.get("slotId"),
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  const result = await deleteStudioPhoto(
    parsed.data.slotKind,
    parsed.data.slotId,
  );
  if (result?.deletedSrc) {
    await deletePhotoFromStorage(result.deletedSrc);
  }

  revalidateForSlot(parsed.data.slotKind);
  return { ok: true };
}

function revalidateForSlot(kind: PhotoSlotKind): void {
  revalidatePath("/[locale]/admin/photos", "page");
  switch (kind) {
    case "service":
      revalidatePath("/[locale]/services", "page");
      revalidatePath("/[locale]/services/[id]", "page");
      revalidatePath("/[locale]/home", "page");
      break;
    case "gallery":
      revalidatePath("/[locale]/gallery", "page");
      revalidatePath("/[locale]/home", "page");
      break;
    case "atelier":
      revalidatePath("/[locale]/home", "page");
      break;
    case "master":
    case "testimonial":
      revalidatePath("/[locale]/master", "page");
      revalidatePath("/[locale]/home", "page");
      break;
    case "profile":
      revalidatePath("/[locale]/profile", "page");
      break;
  }
}
