export type Category = "Care" | "Gel" | "Design" | "Form";

export type GalleryTag = "Editorial" | "Gel" | "Chrome" | "Lace" | "Bridal";

export type MembershipTierName = "Petale" | "Violette" | "Atelier";

export interface Service {
  id: string;
  name: string;
  category: Category;
  duration: string;
  price: number;
  blurb: string;
  includes: string[];
  hero: string;
}

export interface GalleryItem {
  id: string;
  tag: GalleryTag;
  palette: readonly [string, string];
  h: number;
}

export interface MembershipTier {
  tier: MembershipTierName;
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
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
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
  membership: MembershipTierName | null;
  joined: number;
  palette: readonly [string, string];
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
