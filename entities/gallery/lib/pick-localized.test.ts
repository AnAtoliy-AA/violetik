import { describe, expect, it } from "vitest";
import { pickLocalizedName, pickLocalizedCaption } from "./pick-localized";

const nameRow = { nameEn: "Editorial", nameRu: "Эдиториал", nameBy: "Эдыторыял" };

describe("pickLocalizedName", () => {
  it("returns the locale-specific name, defaulting to en", () => {
    expect(pickLocalizedName(nameRow, "en")).toBe("Editorial");
    expect(pickLocalizedName(nameRow, "ru")).toBe("Эдиториал");
    expect(pickLocalizedName(nameRow, "by")).toBe("Эдыторыял");
  });
});

describe("pickLocalizedCaption", () => {
  it("returns the locale caption when present", () => {
    const row = { captionEn: "Chrome set", captionRu: "Хром", captionBy: "Хром" };
    expect(pickLocalizedCaption(row, "en")).toBe("Chrome set");
    expect(pickLocalizedCaption(row, "ru")).toBe("Хром");
  });

  it("returns null for missing or whitespace captions (so the view can fall back)", () => {
    expect(
      pickLocalizedCaption(
        { captionEn: null, captionRu: null, captionBy: null },
        "en",
      ),
    ).toBeNull();
    expect(
      pickLocalizedCaption(
        { captionEn: "   ", captionRu: "x", captionBy: "x" },
        "en",
      ),
    ).toBeNull();
  });
});
