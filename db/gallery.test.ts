import { describe, expect, it } from "vitest";
import {
  listGalleryCategories,
  listGalleryItems,
  getGalleryCategoryById,
  getGalleryItemById,
} from "./gallery";

describe("db/gallery (reads)", () => {
  it("returns empty arrays / null without the DB", async () => {
    expect(await listGalleryCategories()).toEqual([]);
    expect(await listGalleryItems()).toEqual([]);
    expect(await getGalleryCategoryById("editorial")).toBeNull();
    expect(await getGalleryItemById("g1")).toBeNull();
  });
});
