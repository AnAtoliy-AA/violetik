import { describe, it, expect } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./types";
import {
  cityForLocale,
  addressForLocale,
  studioLocationLine,
} from "./locale-fields";

const SAMPLE = {
  ...DEFAULT_SITE_SETTINGS,
  cityEn: "Borisov",
  cityRu: "Борисов",
  cityBe: "Барысаў",
  addressEn: "12 Rose Street",
  addressRu: "12 Розовая",
  addressBe: "12 Ружовая",
};

describe("cityForLocale", () => {
  it("returns the matching per-locale city", () => {
    expect(cityForLocale(SAMPLE, "en")).toBe("Borisov");
    expect(cityForLocale(SAMPLE, "ru")).toBe("Борисов");
    expect(cityForLocale(SAMPLE, "be")).toBe("Барысаў");
  });

  it("falls back to EN when the locale-specific city is empty", () => {
    expect(cityForLocale({ ...SAMPLE, cityRu: "" }, "ru")).toBe("Borisov");
  });

  it("returns empty string when every field is empty", () => {
    expect(cityForLocale(DEFAULT_SITE_SETTINGS, "ru")).toBe("");
  });
});

describe("addressForLocale", () => {
  it("returns the matching per-locale address", () => {
    expect(addressForLocale(SAMPLE, "be")).toBe("12 Ружовая");
  });

  it("falls back to EN when the locale-specific address is empty", () => {
    expect(addressForLocale({ ...SAMPLE, addressBe: "" }, "be")).toBe(
      "12 Rose Street",
    );
  });
});

describe("studioLocationLine", () => {
  it("returns 'address · city' when city is set", () => {
    expect(studioLocationLine(SAMPLE, "en")).toBe("12 Rose Street · Borisov");
    expect(studioLocationLine(SAMPLE, "ru")).toBe("12 Розовая · Борисов");
  });

  it("returns only the address when city is empty", () => {
    expect(
      studioLocationLine(
        { ...SAMPLE, cityEn: "", cityRu: "", cityBe: "" },
        "en",
      ),
    ).toBe("12 Rose Street");
  });
});
