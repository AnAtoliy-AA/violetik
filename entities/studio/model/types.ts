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
