import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));
vi.mock("@/db/gallery-mutations", () => ({
  createGalleryCategory: vi.fn(async () => ({ ok: true })),
  updateGalleryCategory: vi.fn(async () => ({ ok: true })),
  deleteGalleryCategory: vi.fn(async () => ({ ok: true })),
  reorderGalleryCategories: vi.fn(async () => ({ ok: true })),
  countGalleryItemsInCategory: vi.fn(async () => 0),
  createGalleryItem: vi.fn(async () => ({ ok: true })),
  updateGalleryItem: vi.fn(async () => ({ ok: true })),
  deleteGalleryItem: vi.fn(async () => ({ deletedSrc: null })),
  reorderGalleryItems: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/db/gallery", () => ({
  getGalleryItemById: vi.fn(async () => null),
}));
vi.mock("@/shared/lib/photo-storage", () => ({
  deletePhotoFromStorage: vi.fn(async () => {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import * as mutations from "@/db/gallery-mutations";
import {
  createGalleryCategoryAction,
  deleteGalleryCategoryAction,
  reorderGalleryCategoriesAction,
} from "./category-actions";
import { createGalleryItemAction } from "./item-actions";

const goodCategory = {
  id: "editorial",
  nameEn: "Editorial",
  nameRu: "Эдиториал",
  nameBy: "Эдыторыял",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "1");
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: true,
    user: { id: "u_admin" },
  } as never);
});

describe("gallery category actions", () => {
  it("creates a valid category when the admin is authenticated", async () => {
    const r = await createGalleryCategoryAction(goodCategory);
    expect(r).toEqual({ ok: true });
    expect(mutations.createGalleryCategory).toHaveBeenCalledOnce();
  });

  it("rejects an invalid slug", async () => {
    const r = await createGalleryCategoryAction({
      ...goodCategory,
      id: "Bad Slug",
    });
    expect(r.ok).toBe(false);
    expect(mutations.createGalleryCategory).not.toHaveBeenCalled();
  });

  it("blocks the admin when not signed in", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "unauthorized",
    } as never);
    const r = await createGalleryCategoryAction(goodCategory);
    expect(r).toEqual({ ok: false, error: "unauthorized" });
  });

  it("refuses to delete a category that still has pictures", async () => {
    vi.mocked(mutations.countGalleryItemsInCategory).mockResolvedValue(3);
    const r = await deleteGalleryCategoryAction("editorial");
    expect(r).toEqual({
      ok: false,
      error: "category_has_items",
      blockingItemCount: 3,
    });
    expect(mutations.deleteGalleryCategory).not.toHaveBeenCalled();
  });

  it("deletes an empty category", async () => {
    vi.mocked(mutations.countGalleryItemsInCategory).mockResolvedValue(0);
    const r = await deleteGalleryCategoryAction("editorial");
    expect(r).toEqual({ ok: true });
    expect(mutations.deleteGalleryCategory).toHaveBeenCalledWith("editorial");
  });

  it("validates the reorder payload", async () => {
    expect(await reorderGalleryCategoriesAction("nope")).toEqual({
      ok: false,
      error: "invalid_order",
    });
    expect(await reorderGalleryCategoriesAction(["a", "b"])).toEqual({
      ok: true,
    });
  });
});

describe("gallery item actions", () => {
  it("creates an item with no image (gradient fallback)", async () => {
    const r = await createGalleryItemAction({
      id: "g9",
      categoryId: "editorial",
    });
    expect(r).toEqual({ ok: true });
    expect(mutations.createGalleryItem).toHaveBeenCalledOnce();
  });
});
