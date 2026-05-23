import { describe, expect, it } from "vitest";
import {
  slugSchema,
  categoryFormSchema,
  serviceFormSchema,
} from "./schema";

describe("slugSchema", () => {
  it("accepts lowercase alphanumeric + hyphens", () => {
    expect(slugSchema.safeParse("signature-manicure").success).toBe(true);
  });
  it("rejects uppercase", () => {
    expect(slugSchema.safeParse("Signature").success).toBe(false);
  });
  it("rejects punctuation", () => {
    expect(slugSchema.safeParse("hello world").success).toBe(false);
  });
  it("rejects an empty string", () => {
    expect(slugSchema.safeParse("").success).toBe(false);
  });
});

describe("categoryFormSchema", () => {
  const base = {
    id: "care",
    nameEn: "Care",
    nameRu: "Уход",
    nameBy: "Догляд",
    status: "published" as const,
  };
  it("accepts a complete payload", () => {
    expect(categoryFormSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty locale name", () => {
    expect(categoryFormSchema.safeParse({ ...base, nameRu: "" }).success).toBe(
      false,
    );
  });
});

describe("serviceFormSchema", () => {
  const base = {
    id: "signature",
    categoryId: "care",
    nameEn: "Signature",
    nameRu: "Сигнатур",
    nameBy: "Сігнатур",
    blurbEn: "EN",
    blurbRu: "RU",
    blurbBy: "BE",
    includes: [
      { en: "a", ru: "а", by: "а" },
      { en: "b", ru: "б", by: "б" },
    ],
    priceCents: 9500,
    durationMinutes: 75,
    status: "published" as const,
  };
  it("accepts a complete payload", () => {
    expect(serviceFormSchema.safeParse(base).success).toBe(true);
  });
  it("rejects empty blurb in any locale", () => {
    expect(
      serviceFormSchema.safeParse({ ...base, blurbBy: "" }).success,
    ).toBe(false);
  });
  it("rejects more than 8 bullets", () => {
    const tooMany = Array.from({ length: 9 }, () => ({
      en: "x",
      ru: "x",
      by: "x",
    }));
    expect(
      serviceFormSchema.safeParse({ ...base, includes: tooMany }).success,
    ).toBe(false);
  });
  it("rejects a bullet missing a locale", () => {
    expect(
      serviceFormSchema.safeParse({
        ...base,
        includes: [{ en: "x", ru: "x", by: "" }],
      }).success,
    ).toBe(false);
  });
  it("rejects negative priceCents", () => {
    expect(
      serviceFormSchema.safeParse({ ...base, priceCents: -1 }).success,
    ).toBe(false);
  });
  it("rejects zero-minute duration", () => {
    expect(
      serviceFormSchema.safeParse({ ...base, durationMinutes: 0 }).success,
    ).toBe(false);
  });
});
