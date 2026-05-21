import type {
  Artist,
  AtelierClip,
  CustomerProfile,
  GalleryItem,
  MembershipTier,
  StudioInfo,
  Testimonial,
  Visit,
} from "./types";

const studio: StudioInfo = {
  name: "Violetta Beauty",
  tagline: "A private nail atelier",
  address: "By appointment · Verbena Lane 14, Studio B",
  hours: "Tue – Sat · 10:00 – 19:00",
  instagram: "@violetta.atelier",
};

const artist: Artist = {
  name: "Violetta Marchenko",
  role: "Master nail artist & founder",
  years: 11,
  bio:
    "Trained in Milan and Kyiv, Violetta runs a one-chair atelier — one guest at a time, by appointment only. " +
    "Specialising in editorial nail design, glass shapes and Japanese gel.",
  quote:
    "A manicure is the smallest piece of jewellery a woman wears every day.",
};

const gallery: GalleryItem[] = [
  { id: "g1", tag: "Chrome", palette: ["#c9a96e", "#7d3a6f"], h: 220 },
  { id: "g2", tag: "Editorial", palette: ["#d9a3b6", "#1a0f1f"], h: 280 },
  { id: "g3", tag: "Gel", palette: ["#9d7bc7", "#3a2050"], h: 200 },
  { id: "g4", tag: "Lace", palette: ["#f3ead8", "#7d3a6f"], h: 260 },
  { id: "g5", tag: "Chrome", palette: ["#e8cf99", "#2a1a30"], h: 240 },
  { id: "g6", tag: "Editorial", palette: ["#7d3a6f", "#14091a"], h: 300 },
  { id: "g7", tag: "Bridal", palette: ["#f3ead8", "#d9a3b6"], h: 220 },
  { id: "g8", tag: "Gel", palette: ["#9d7bc7", "#c9a96e"], h: 250 },
];

const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Lara K.",
    role: "Member · 3y",
    text:
      "It's a ritual, not a manicure. The studio smells of fig and amber. I never go anywhere else.",
  },
  {
    id: "t2",
    name: "Iris M.",
    role: "Member · 1y",
    text:
      "Violetta's hands are a museum. I came for nails and left with art on my fingertips.",
  },
  {
    id: "t3",
    name: "Joelle P.",
    role: "Member · 2y",
    text: "Quiet, private, exquisite. The kind of hour you don't share — you keep.",
  },
];

const membership: MembershipTier[] = [
  {
    tier: "Member",
    price: 0,
    cadence: "Open",
    perks: ["Online booking", "Two reminders", "Gallery access"],
    featured: false,
  },
  {
    tier: "VIP",
    price: 180,
    cadence: "/ month",
    perks: [
      "Two visits per month",
      "Priority calendar",
      "Welcome flute & ritual",
      "10% on art & extensions",
    ],
    featured: true,
  },
];

const profile: CustomerProfile = {
  name: "Lara K.",
  joined: 2024,
  palette: ["#d9a3b6", "#7d3a6f"],
};

const visits: Visit[] = [
  {
    id: "v-next",
    serviceId: "gel",
    date: "2026-06-07",
    time: "16:30",
    price: 145,
    status: "upcoming",
    daysAway: 4,
  },
  {
    id: "v-1",
    serviceId: "signature",
    date: "2026-05-12",
    time: "11:00",
    price: 95,
    status: "past",
  },
  {
    id: "v-2",
    serviceId: "editorial",
    date: "2026-04-22",
    time: "14:00",
    price: 195,
    status: "past",
  },
  {
    id: "v-3",
    serviceId: "pedi",
    date: "2026-03-30",
    time: "10:30",
    price: 110,
    status: "past",
  },
  {
    id: "v-4",
    serviceId: "gel",
    date: "2026-03-04",
    time: "17:00",
    price: 145,
    status: "past",
  },
];

/**
 * Three home clips. Drop matching files at:
 *   public/studio/atelier/{key}.mp4
 *   public/studio/atelier/{key}-poster.jpg
 * then set `video: { src: "/studio/atelier/{key}.mp4", posterSrc: ... }`
 * on each entry to swap from gradient placeholder to real footage.
 */
const atelierClips: AtelierClip[] = [
  { key: "buff", palette: ["#7d3a6f", "#c9a96e"] },
  { key: "polish", palette: ["#9d7bc7", "#e8cf99"] },
  { key: "design", palette: ["#d9a3b6", "#7d3a6f"] },
];

export const STUDIO_DATA = {
  studio,
  artist,
  gallery,
  testimonials,
  membership,
  profile,
  visits,
  atelierClips,
} as const;
