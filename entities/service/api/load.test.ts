import { describe, expect, it } from "vitest";
import { _toService } from "./load";
import type { Service as DbService, ServiceCategoryRow } from "@/db/schema";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/entities/site-settings";

const baseSettings: SiteSettings = {
  ...DEFAULT_SITE_SETTINGS,
  defaultPalette: "aubergine",
  defaultLocale: "en",
  priceOverrides: {},
  discountPercent: 0,
  discountActive: false,
  currency: "EUR",
  updatedAt: new Date(0).toISOString(),
};

const dbCare: ServiceCategoryRow = {
  id: "care",
  nameEn: "Care",
  nameRu: "Уход",
  nameBe: "Догляд",
  sortOrder: 1,
  status: "published",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  updatedBy: null,
};

const dbSignature: DbService = {
  id: "signature",
  categoryId: "care",
  nameEn: "Signature Manicure",
  nameRu: "Сигнатурный маникюр",
  nameBe: "Сігнатурны манікюр",
  blurbEn: "EN blurb",
  blurbRu: "RU blurb",
  blurbBe: "BE blurb",
  includes: [
    { en: "Soak", ru: "Ванна", be: "Ванна" },
    { en: "File", ru: "Опил", be: "Апіл" },
  ],
  priceCents: 9500,
  durationMinutes: 75,
  sortOrder: 1,
  status: "published",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  updatedBy: null,
};

describe("_toService", () => {
  it("picks the en columns for locale=en and formats EUR", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "en",
      currency: "EUR",
      settings: baseSettings,
    });
    expect(s.name).toBe("Signature Manicure");
    expect(s.blurb).toBe("EN blurb");
    expect(s.category).toEqual({ id: "care", name: "Care" });
    expect(s.includes).toEqual(["Soak", "File"]);
    expect(s.price).toBe(95);
    expect(s.priceCents).toBe(9500);
    expect(s.displayPrice).toBe("€95");
    expect(s.duration).toBe("75 min");
    expect(s.durationMinutes).toBe(75);
    expect(s.sortOrder).toBe(1);
  });

  it("picks the ru columns and formats the ru duration label", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "ru",
      currency: "EUR",
      settings: baseSettings,
    });
    expect(s.name).toBe("Сигнатурный маникюр");
    expect(s.category.name).toBe("Уход");
    expect(s.includes).toEqual(["Ванна", "Опил"]);
    expect(s.duration).toBe("75 мин");
  });

  it("picks be columns and formats be duration", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "be",
      currency: "EUR",
      settings: baseSettings,
    });
    expect(s.name).toBe("Сігнатурны манікюр");
    expect(s.category.name).toBe("Догляд");
    expect(s.includes).toEqual(["Ванна", "Апіл"]);
    expect(s.duration).toBe("75 хв");
  });

  it("applies discountActive + discountPercent to price/displayPrice", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "en",
      currency: "EUR",
      settings: {
        ...baseSettings,
        discountActive: true,
        discountPercent: 20,
      },
    });
    // 9500 * 0.8 = 7600 cents → €76
    expect(s.priceCents).toBe(7600);
    expect(s.price).toBe(76);
    expect(s.displayPrice).toBe("€76");
  });

  it("threads the photo asset into service.image when present", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: {
        slotKind: "service",
        slotId: "signature",
        image: { src: "/x.jpg", width: 100, height: 120 },
        uploadedAt: new Date(0).toISOString(),
        uploadedBy: null,
      },
      locale: "en",
      currency: "EUR",
      settings: baseSettings,
    });
    expect(s.image?.src).toBe("/x.jpg");
  });
});
