// This module touches @vercel/blob and should only be invoked from server
// actions or RSCs. Vitest exercises it directly (with @vercel/blob mocked
// in storage.test.ts) so we don't add the `server-only` import barrier.
import { del, put } from "@vercel/blob";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_BYTES,
  type PhotoUploadError,
} from "./limits";
import { buildBlobKey } from "./keys";

export type { PhotoUploadError } from "./limits";
export { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES } from "./limits";

export interface UploadPhotoInput {
  /** Logical bucket — used to build the blob key. */
  slotKind: string;
  /** Stable slot identifier — used to build the blob key. */
  slotId: string;
  /** The file from a `<form>` submission. */
  file: File;
}

export interface UploadPhotoResult {
  src: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Detail surfaced to the admin UI when the upload fails. Holds the raw
 * @vercel/blob (or network) error message — server logs already get the
 * stack via console.error, but the UI shows the message so the admin can
 * see "Invalid token" / "Permission denied" / etc. without opening the
 * dev console.
 */
export interface PhotoUploadErrorDetail {
  message: string;
}

/**
 * True when the `BLOB_READ_WRITE_TOKEN` env var is present. The admin form
 * uses this to disable the upload control and surface an explanatory message
 * in local dev / CI without a Vercel Blob store provisioned.
 */
export function isPhotoStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function validate(
  file: File,
): { ok: true } | { ok: false; reason: PhotoUploadError } {
  if (file.size === 0) return { ok: false, reason: "empty_file" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, reason: "too_large" };
  if (
    !ALLOWED_PHOTO_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number],
    )
  ) {
    return { ok: false, reason: "unsupported_type" };
  }
  return { ok: true };
}

/**
 * Uploads `file` to Vercel Blob under a deterministic path
 * `studio/<slotKind>/<slotId>-<stamp>.<ext>` and returns the public URL.
 *
 * Returns a discriminated error result rather than throwing so callers
 * (server actions) can map outcomes to translated user messages cleanly.
 */
export async function uploadPhotoToStorage(
  input: UploadPhotoInput,
): Promise<
  | { ok: true; value: UploadPhotoResult }
  | { ok: false; error: PhotoUploadError; detail?: PhotoUploadErrorDetail }
> {
  if (!isPhotoStorageConfigured()) {
    return { ok: false, error: "not_configured" };
  }
  const check = validate(input.file);
  if (!check.ok) return { ok: false, error: check.reason };

  const key = buildBlobKey(input.slotKind, input.slotId, input.file.type);
  try {
    const blob = await put(key, input.file, {
      access: "public",
      contentType: input.file.type,
      addRandomSuffix: false,
    });
    return {
      ok: true,
      value: {
        src: blob.url,
        contentType: input.file.type,
        sizeBytes: input.file.size,
      },
    };
  } catch (error) {
    // Surface the real reason — auth, network, region, etc. — so we don't
    // have to debug from a generic "upload_failed". Server log gets the
    // full error; the caller gets the message string.
    console.error("[photo-storage] upload failed", { key, error });
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    return {
      ok: false,
      error: "upload_failed",
      detail: { message },
    };
  }
}

/** Deletes a previously-uploaded blob. Silent no-op when not configured. */
export async function deletePhotoFromStorage(src: string): Promise<void> {
  if (!isPhotoStorageConfigured()) return;
  try {
    await del(src);
  } catch {
    // The blob may already be gone — uploads with `addRandomSuffix: false`
    // can overwrite, in which case deletion of the old URL 404s. Swallow.
  }
}
