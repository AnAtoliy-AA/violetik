import { describe, expect, it } from "vitest";
import {
  galleryCategoryFormSchema,
  galleryItemFormSchema,
} from "./schema";

describe("galleryCategoryFormSchema", () => {
  it("accepts a valid trilingual category", () => {
    const r = galleryCategoryFormSchema.safeParse({
      id: "editorial",
      nameEn: "Editorial",
      nameRu: "Эдиториал",
      nameBy: "Эдыторыял",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid slug and a missing locale name", () => {
    expect(
      galleryCategoryFormSchema.safeParse({
        id: "Editorial Cat",
        nameEn: "E",
        nameRu: "E",
        nameBy: "E",
      }).success,
    ).toBe(false);
    expect(
      galleryCategoryFormSchema.safeParse({
        id: "editorial",
        nameEn: "",
        nameRu: "E",
        nameBy: "E",
      }).success,
    ).toBe(false);
  });
});

describe("galleryItemFormSchema", () => {
  it("accepts an item with no image (gradient fallback)", () => {
    const r = galleryItemFormSchema.safeParse({
      id: "g1",
      categoryId: "chrome",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.src).toBeUndefined();
      expect(r.data.captionEn).toBeUndefined();
    }
  });

  it("normalizes empty captions to undefined", () => {
    const r = galleryItemFormSchema.safeParse({
      id: "g1",
      categoryId: "chrome",
      captionEn: "  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.captionEn).toBeUndefined();
  });

  it("rejects a non-Blob src URL", () => {
    expect(
      galleryItemFormSchema.safeParse({
        id: "g1",
        categoryId: "chrome",
        src: "https://evil.example.com/x.jpg",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid Vercel Blob src URL", () => {
    expect(
      galleryItemFormSchema.safeParse({
        id: "g1",
        categoryId: "chrome",
        src: "https://abc123.public.blob.vercel-storage.com/gallery/g1-x.jpg",
        width: 1200,
        height: 1500,
      }).success,
    ).toBe(true);
  });
});
