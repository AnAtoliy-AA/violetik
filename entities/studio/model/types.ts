export type Category = "Care" | "Gel" | "Design" | "Form";

export type GalleryTag =
  | "Editorial"
  | "Gel"
  | "Chrome"
  | "Lace"
  | "Bridal";

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
