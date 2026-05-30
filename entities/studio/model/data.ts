import type {
  AtelierClip,
  CustomerProfile,
  GalleryItem,
  MembershipTier,
  StudioInfo,
  Visit,
} from "./types";

const studio: StudioInfo = {
  name: "Violetta Beauty",
  tagline: "A private nail atelier",
  hours: "Tue – Sat · 10:00 – 19:00",
  instagram: "@violetta.atelier",
};

const gallery: GalleryItem[] = [
  {
    id: "g1",
    tag: "Chrome",
    palette: ["#c9a96e", "#7d3a6f"],
    paletteDots: ["#c9a96e", "#a98850", "#7d3a6f", "#3a1a3a"],
    h: 220,
  },
  {
    id: "g2",
    tag: "Editorial",
    palette: ["#d9a3b6", "#1a0f1f"],
    paletteDots: ["#d9a3b6", "#a55c7a", "#4a2a48", "#1a0f1f"],
    h: 280,
  },
  {
    id: "g3",
    tag: "Gel",
    palette: ["#9d7bc7", "#3a2050"],
    paletteDots: ["#9d7bc7", "#6f4ea0", "#3a2050", "#1a1030"],
    h: 200,
  },
  {
    id: "g4",
    tag: "Lace",
    palette: ["#f3ead8", "#7d3a6f"],
    paletteDots: ["#f3ead8", "#d4a9b8", "#a05080", "#7d3a6f"],
    h: 260,
  },
  {
    id: "g5",
    tag: "Chrome",
    palette: ["#e8cf99", "#2a1a30"],
    paletteDots: ["#e8cf99", "#b69870", "#5a3848", "#2a1a30"],
    h: 240,
  },
  {
    id: "g6",
    tag: "Editorial",
    palette: ["#7d3a6f", "#14091a"],
    paletteDots: ["#7d3a6f", "#4f234a", "#2a1530", "#14091a"],
    h: 300,
  },
  {
    id: "g7",
    tag: "Bridal",
    palette: ["#f3ead8", "#d9a3b6"],
    paletteDots: ["#f3ead8", "#e5c7c4", "#d9a3b6", "#a06080"],
    h: 220,
  },
  {
    id: "g8",
    tag: "Gel",
    palette: ["#9d7bc7", "#c9a96e"],
    paletteDots: ["#9d7bc7", "#b39ac9", "#d4b890", "#c9a96e"],
    h: 250,
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
  gallery,
  membership,
  profile,
  visits,
  atelierClips,
} as const;
