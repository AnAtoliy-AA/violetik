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

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

export const MAX_PHOTO_MB = MAX_PHOTO_BYTES / (1024 * 1024);

export type PhotoUploadError =
  | "not_configured"
  | "empty_file"
  | "unsupported_type"
  | "too_large"
  | "upload_failed";
