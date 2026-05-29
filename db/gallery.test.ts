import { describe, expect, it, vi } from "vitest";

// Force the db-unavailable path so the test is hermetic regardless of
// whether the runner has DATABASE_URL set (locally it does, via .env.local).
vi.mock("./index", () => ({ db: null, schema: {} }));

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
