// TODO: replace with VIOLETTA_DATA extracted from `Violetta Beauty.html`
// prototype's `src/components.jsx`. Shape is final; values are placeholders.

import type { GalleryItem, MembershipTier, Service } from "./types";

const services: Service[] = [
  {
    id: "care-classic",
    name: "Classic Care",
    category: "Care",
    duration: "60 min",
    price: 65,
    blurb: "Shape, cuticle, and a quiet hand polish.",
    includes: ["File and shape", "Cuticle care", "Hand massage", "Polish"],
    hero: "care-classic",
  },
  {
    id: "gel-signature",
    name: "Signature Gel",
    category: "Gel",
    duration: "75 min",
    price: 95,
    blurb: "Long-wear gel with a museum-grade finish.",
    includes: ["Prep and shape", "Gel base", "2 colour coats", "Top seal"],
    hero: "gel-signature",
  },
  {
    id: "design-couture",
    name: "Couture Design",
    category: "Design",
    duration: "120 min",
    price: 180,
    blurb: "Hand-painted accents, foils, or chrome.",
    includes: ["Consultation", "Hand-painted accents", "Foil or chrome"],
    hero: "design-couture",
  },
  {
    id: "form-extension",
    name: "Form Extension",
    category: "Form",
    duration: "150 min",
    price: 220,
    blurb: "Sculpted extensions with a structural finish.",
    includes: ["Form prep", "Sculpted apex", "Refined finish"],
    hero: "form-extension",
  },
];

const gallery: GalleryItem[] = [
  { id: "g1", tag: "Editorial", palette: ["#7d3a6f", "#100612"], h: 280 },
  { id: "g2", tag: "Gel", palette: ["#c9a96e", "#1f0e25"], h: 240 },
  { id: "g3", tag: "Chrome", palette: ["#e8cf99", "#2a1432"], h: 260 },
  { id: "g4", tag: "Lace", palette: ["#d9a3b6", "#18091c"], h: 220 },
  { id: "g5", tag: "Bridal", palette: ["#fff5d6", "#100612"], h: 300 },
  { id: "g6", tag: "Editorial", palette: ["#9d7bc7", "#18091c"], h: 240 },
];

const membership: MembershipTier[] = [
  {
    tier: "Petale",
    price: 60,
    cadence: "per month",
    perks: ["One signature gel per month", "Booking priority"],
    featured: false,
  },
  {
    tier: "Violette",
    price: 120,
    cadence: "per month",
    perks: [
      "Two signature gels per month",
      "10% off design upgrades",
      "Booking priority",
    ],
    featured: true,
  },
  {
    tier: "Atelier",
    price: 220,
    cadence: "per month",
    perks: [
      "Unlimited care + 2 design sessions",
      "Early access to new finishes",
      "Companion treatment per quarter",
    ],
    featured: false,
  },
];

export const STUDIO_DATA = {
  services,
  gallery,
  membership,
} as const;
