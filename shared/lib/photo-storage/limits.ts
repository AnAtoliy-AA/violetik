// Client-safe constants and types for photo uploads. Lives in its own
// module so client components (the admin upload form) can import the size
// cap without dragging `@vercel/blob` into the client bundle via
// `./storage`.

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

// Generous cap — phone photos can be 8–20 MB. The actual upload bypasses
// the Vercel 4.5 MB function body cap via client-direct upload to Blob
// (see /api/admin/photos/upload-token), so the limit here is a UX/cost
// guard, not a technical constraint.
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // 25 MB

export const MAX_PHOTO_MB = MAX_PHOTO_BYTES / (1024 * 1024);

export type PhotoUploadError =
  | "not_configured"
  | "empty_file"
  | "unsupported_type"
  | "too_large"
  | "upload_failed";
