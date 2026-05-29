import { describe, expect, it, vi, beforeEach } from "vitest";

const listGalleryCategories = vi.fn();
const listGalleryItems = vi.fn();

vi.mock("@/db/gallery", () => ({
  listGalleryCategories: () => listGalleryCategories(),
  listGalleryItems: () => listGalleryItems(),
}));

import { loadGallery } from "./load";

function categoryRow(over: Record<string, unknown> = {}) {
  return {
    id: "chrome",
    nameEn: "Chrome",
    nameRu: "Хром",
    nameBy: "Хром",
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: "g1",
    categoryId: "chrome",
    captionEn: null,
    captionRu: null,
    captionBy: null,
    alt: null,
    src: null,
    width: null,
    height: null,
    blurDataUrl: null,
    palette: null,
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

describe("loadGallery", () => {
  it("resolves localized category names and maps items", async () => {
    listGalleryCategories.mockResolvedValue([categoryRow()]);
    listGalleryItems.mockResolvedValue([
      itemRow({ palette: ["#c9a96e", "#7d3a6f"] }),
    ]);
    const data = await loadGallery("ru");
    expect(data.categories).toEqual([{ id: "chrome", name: "Хром" }]);
    expect(data.items[0]).toMatchObject({
      id: "g1",
      categoryId: "chrome",
      categoryName: "Хром",
      caption: null,
      palette: ["#c9a96e", "#7d3a6f"],
    });
    expect(data.items[0]!.image).toBeUndefined();
  });

  it("uses the default palette tuple when the row has none", async () => {
    listGalleryCategories.mockResolvedValue([categoryRow()]);
    listGalleryItems.mockResolvedValue([itemRow({ palette: null })]);
    const data = await loadGallery("en");
    expect(data.items[0]!.palette).toEqual(["#7d3a6f", "#14091a"]);
  });

  it("builds an image asset and a localized caption when present", async () => {
    listGalleryCategories.mockResolvedValue([categoryRow()]);
    listGalleryItems.mockResolvedValue([
      itemRow({
        src: "https://x.public.blob.vercel-storage.com/gallery/g1.jpg",
        alt: "a set",
        width: 1200,
        height: 1500,
        captionEn: "Chrome set",
      }),
    ]);
    const data = await loadGallery("en");
    expect(data.items[0]!.caption).toBe("Chrome set");
    expect(data.items[0]!.image).toMatchObject({
      src: "https://x.public.blob.vercel-storage.com/gallery/g1.jpg",
      alt: "a set",
      width: 1200,
      height: 1500,
    });
    // 1500/1200 ratio → 240 * 1.25 = 300 (clamped to <=320).
    expect(data.items[0]!.h).toBe(300);
  });

  it("falls back to the legacy gallery when the DB returns nothing", async () => {
    listGalleryCategories.mockResolvedValue([]);
    listGalleryItems.mockResolvedValue([]);
    const data = await loadGallery("en");
    // Legacy snapshot: 5 categories, 8 tiles — so the page never goes blank.
    expect(data.categories).toHaveLength(5);
    expect(data.items).toHaveLength(8);
    expect(data.categories.map((c) => c.id)).toContain("chrome");
  });
});
