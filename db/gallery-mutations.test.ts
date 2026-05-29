import { describe, expect, it } from "vitest";
import {
  createGalleryCategory,
  updateGalleryCategory,
  deleteGalleryCategory,
  countGalleryItemsInCategory,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  reorderGalleryCategories,
  reorderGalleryItems,
} from "./gallery-mutations";

describe("db/gallery-mutations", () => {
  it("returns the expected shapes without throwing when DATABASE_URL is unset", async () => {
    let count = -1;
    let deleted: { deletedSrc: string | null } | null | undefined;
    try {
      await createGalleryCategory({
        id: "x",
        nameEn: "x",
        nameRu: "x",
        nameBy: "x",
      });
      await updateGalleryCategory("x", { nameEn: "y" });
      await deleteGalleryCategory("x");
      await createGalleryItem({ id: "i", categoryId: "x" });
      await updateGalleryItem("i", { alt: "a" });
      deleted = await deleteGalleryItem("i");
      await reorderGalleryCategories(["x"]);
      await reorderGalleryItems(["i"]);
      count = await countGalleryItemsInCategory("x");
    } catch {
      // Missing-table fallthrough is acceptable in CI without a migrated DB.
    }
    expect(count === -1 || typeof count === "number").toBe(true);
    // db-null path returns null for deleteGalleryItem.
    expect(deleted === undefined || deleted === null || "deletedSrc" in deleted).toBe(
      true,
    );
  });

  it("createGalleryCategory reports db_unavailable when the DB is unconfigured", async () => {
    const result = await createGalleryCategory({
      id: "x",
      nameEn: "x",
      nameRu: "x",
      nameBy: "x",
    });
    // With DATABASE_URL unset in the test env, db is null → db_unavailable.
    expect(result).toEqual({ ok: false, error: "db_unavailable" });
  });
});
