"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  deletePhotoFromStorage,
  type PhotoUploadError,
} from "@/shared/lib/photo-storage";
import { isValidBlobKey } from "@/shared/lib/photo-storage/keys";
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

const finalizeSchema = z.object({
  slotKind: slotKindSchema,
  slotId: z.string().min(1).max(64),
  alt: z.string().trim().min(1, "alt_required").max(280),
  src: z
    .string()
    .url()
    .refine(
      (url) => /\.public\.blob\.vercel-storage\.com\//.test(url),
      "not a Vercel Blob URL",
    ),
  // Pathname is what we issued the upload token for — refuse to record any
  // other key under this slot.
  pathname: z.string().refine(isValidBlobKey, "invalid blob key"),
  width: intInRange(0, 30_000),
  height: intInRange(0, 30_000),
});

export type FinalizeStudioPhotoUploadInput = z.input<typeof finalizeSchema>;

export type FinalizeStudioPhotoUploadResult =
  | { ok: true; src: string }
  | {
      ok: false;
      error: PhotoUploadError | "auth" | "validation";
      detail?: string;
    };

/**
 * Records a client-direct upload — file went straight from browser to
 * Vercel Blob via /api/admin/photos/upload-token; this action validates
 * the resulting URL, writes the DB row, displaces any prior blob, and
 * revalidates the affected customer routes.
 *
 * Replaces the prior File-based server action which was capped by the
 * Vercel 4.5 MB function body limit (see commit history).
 */
export async function finalizeStudioPhotoUploadAction(
  input: FinalizeStudioPhotoUploadInput,
): Promise<FinalizeStudioPhotoUploadResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  let uploadedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: "auth" };
    uploadedBy = gate.user.id;
  }

  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  // The pathname must address the same slot the client claims — otherwise
  // an admin could trick this into pointing slot A at a blob uploaded for
  // slot B. The token-issuing route already constrains it, but defense in
  // depth costs nothing here.
  const expectedPrefix = `studio/${parsed.data.slotKind}/${parsed.data.slotId}-`;
  if (!parsed.data.pathname.startsWith(expectedPrefix)) {
    return { ok: false, error: "validation" };
  }

  try {
    // §9.3 — extract a 4-color palette from the just-uploaded blob so
    // the gallery can render dots beside each image. Best-effort: a
    // failure (network blip, unsupported format) returns null and the
    // upsert proceeds without palette data — the UI falls back to its
    // two-color `palette` constant in that case.
    const { extractPaletteFromUrl } = await import(
      "@/shared/lib/photo-storage/extract-palette"
    );
    const palette = await extractPaletteFromUrl(parsed.data.src, { count: 4 });

    const upsert = await upsertStudioPhoto({
      slotKind: parsed.data.slotKind,
      slotId: parsed.data.slotId,
      src: parsed.data.src,
      alt: parsed.data.alt,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      palette,
      uploadedBy,
    });

    if (upsert?.previousSrc && upsert.previousSrc !== parsed.data.src) {
      await deletePhotoFromStorage(upsert.previousSrc);
    }

    revalidateForSlot(parsed.data.slotKind);
    return { ok: true, src: parsed.data.src };
  } catch (error) {
    console.error("[photo-upload-admin] finalize failed", error);
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    return { ok: false, error: "upload_failed", detail: message };
  }
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
