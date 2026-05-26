export {
  uploadPhotoToStorage,
  deletePhotoFromStorage,
  isPhotoStorageConfigured,
  type UploadPhotoInput,
  type UploadPhotoResult,
} from "./storage";
// Client code should import constants from `@/shared/lib/photo-storage/limits`
// directly to avoid pulling `@vercel/blob` into the client bundle.
export {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
  type PhotoUploadError,
} from "./limits";
