export { STUDIO_DATA } from "./model/data";
export type {
  Artist,
  AtelierClip,
  AtelierClipKey,
  Category,
  CustomerProfile,
  GalleryItem,
  GalleryTag,
  ImageAsset,
  MembershipTier,
  Service,
  StudioInfo,
  Testimonial,
  VideoAsset,
  Visit,
  VisitStatus,
} from "./model/types";
// Server-only loaders ship from `@/entities/studio/api/load-with-photos`.
// They're not re-exported from this barrel to keep it client- and
// storybook-safe (the loaders import the DB and `server-only`).
