// Client + server use the same key shape so the admin form can compute
// the upload pathname before calling @vercel/blob/client `upload()` and
// the token-issuing route can validate it matches.

import { ALLOWED_PHOTO_MIME_TYPES, type PhotoUploadError } from "./limits";

export function mimeToExtension(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}

export function buildBlobKey(
  slotKind: string,
  slotId: string,
  mime: string,
): string {
  const ext = mimeToExtension(mime);
  const stamp = Date.now().toString(36);
  // The trailing stamp avoids cache stickiness across replacements — every
  // upload gets a fresh URL even when the slot identity is unchanged.
  return `studio/${slotKind}/${slotId}-${stamp}.${ext}`;
}

const BLOB_KEY_RE = /^studio\/[a-z]+\/[A-Za-z0-9_-]+-[a-z0-9]+\.(jpg|png|webp|avif)$/;

export function isValidBlobKey(pathname: string): boolean {
  return BLOB_KEY_RE.test(pathname);
}

export function isAllowedPhotoMime(
  mime: string,
): mime is (typeof ALLOWED_PHOTO_MIME_TYPES)[number] {
  return (ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(mime);
}

export type { PhotoUploadError };
