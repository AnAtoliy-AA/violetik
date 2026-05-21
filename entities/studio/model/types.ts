export type Category = "Care" | "Gel" | "Design" | "Form";

export type GalleryTag = "Editorial" | "Gel" | "Chrome" | "Lace" | "Bridal";

/**
 * A studio image asset. `src` can be a local public-path (e.g.
 * `/studio/services/signature.jpg`) or an absolute URL — if you ship a CDN,
 * extend `next.config.ts` `images.remotePatterns` accordingly.
 *
 * When `blurDataURL` is set, `<Image placeholder="blur">` renders a soft
 * blurred LQIP while the full image streams in.
 */
export interface ImageAsset {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
}

/** A studio looping clip — used by the home AtelierMotion section. */
export interface VideoAsset {
  src: string;
  posterSrc?: string;
  /** Accessible label for screen readers, also surfaced as <video aria-label>. */
  alt?: string;
}

export interface Service {
  id: string;
  name: string;
  category: Category;
  duration: string;
  price: number;
  blurb: string;
  includes: string[];
  hero: string;
  /** Optional real photograph; when absent, consumers fall back to NailTile. */
  image?: ImageAsset;
}

export interface GalleryItem {
  id: string;
  tag: GalleryTag;
  palette: readonly [string, string];
  h: number;
  /** Optional real photograph; falls back to the palette gradient when absent. */
  image?: ImageAsset;
}

export type AtelierClipKey = "buff" | "polish" | "design";

export interface AtelierClip {
  key: AtelierClipKey;
  /** Palette used by the gradient placeholder until real footage lands. */
  palette: readonly [string, string];
  /** Optional looping clip; <video> stays unsourced when absent. */
  video?: VideoAsset;
}

export interface MembershipTier {
  tier: "Member" | "VIP";
  price: number;
  cadence: string;
  perks: string[];
  featured: boolean;
}

export interface Artist {
  name: string;
  role: string;
  years: number;
  bio: string;
  quote: string;
  /** Optional portrait used by the master hero card. */
  image?: ImageAsset;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  /** Optional avatar disc; falls back to a gilded gradient when absent. */
  avatar?: ImageAsset;
}

export interface StudioInfo {
  name: string;
  tagline: string;
  address: string;
  hours: string;
  instagram: string;
}

export interface CustomerProfile {
  name: string;
  joined: number;
  palette: readonly [string, string];
  /** Optional photograph; profile uses the gradient + initials when absent. */
  avatar?: ImageAsset;
}

export type VisitStatus = "upcoming" | "past";

export interface Visit {
  id: string;
  serviceId: string;
  /** ISO date (yyyy-mm-dd). The view formats this via Intl.DateTimeFormat. */
  date: string;
  /** Display time in HH:mm (24h). */
  time: string;
  price: number;
  status: VisitStatus;
  /** Days from "today" to the visit. Present only when status === "upcoming". */
  daysAway?: number;
}
