import { describe, expect, it, vi, beforeEach } from "vitest";

const listOnboardingSlides = vi.fn();

vi.mock("@/db/onboarding", () => ({
  listOnboardingSlides: () => listOnboardingSlides(),
}));

import { loadOnboardingSlides } from "./load";

function slideRow(over: Record<string, unknown> = {}) {
  return {
    id: "atelier",
    eyebrowEn: "01 / ATELIER",
    eyebrowRu: "01 / АТЕЛЬЕ",
    eyebrowBy: "01 / АТЭЛЬЕ",
    titleEn: "A studio of one",
    titleRu: "Студия на одного",
    titleBy: "Студыя на аднаго",
    bodyEn: "One chair.",
    bodyRu: "Одно кресло.",
    bodyBy: "Адно крэсла.",
    src: null,
    width: null,
    height: null,
    blurDataUrl: null,
    palette: ["#c9a96e", "#7d3a6f"],
    variant: 1,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadOnboardingSlides", () => {
  it("resolves the locale text and gradient fallback", async () => {
    listOnboardingSlides.mockResolvedValue([slideRow()]);
    const slides = await loadOnboardingSlides("ru");
    expect(slides[0]).toMatchObject({
      id: "atelier",
      eyebrow: "01 / АТЕЛЬЕ",
      title: "Студия на одного",
      body: "Одно кресло.",
      palette: ["#c9a96e", "#7d3a6f"],
      variant: 1,
    });
    expect(slides[0]!.image).toBeUndefined();
  });

  it("uses the localized title as the image alt when a photo is present", async () => {
    listOnboardingSlides.mockResolvedValue([
      slideRow({
        src: "https://x.public.blob.vercel-storage.com/onboarding/atelier.jpg",
      }),
    ]);
    const slides = await loadOnboardingSlides("en");
    expect(slides[0]!.image).toMatchObject({
      src: "https://x.public.blob.vercel-storage.com/onboarding/atelier.jpg",
      alt: "A studio of one",
    });
  });

  it("returns an empty list when the DB is unavailable", async () => {
    listOnboardingSlides.mockResolvedValue([]);
    expect(await loadOnboardingSlides("en")).toEqual([]);
  });
});
