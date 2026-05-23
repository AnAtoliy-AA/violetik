import { describe, it, expect } from "vitest";
import { COUNTRIES, isValidCountryCode } from "./countries";

describe("countries", () => {
  it("contains Belarus, Russia, and the US as a baseline sanity check", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes).toContain("BY");
    expect(codes).toContain("RU");
    expect(codes).toContain("US");
  });

  it("is sorted alphabetically by English name", () => {
    const names = COUNTRIES.map((c) => c.nameEn);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("recognises valid alpha-2 codes via isValidCountryCode", () => {
    expect(isValidCountryCode("BY")).toBe(true);
    expect(isValidCountryCode("ZZ")).toBe(false);
    expect(isValidCountryCode("by")).toBe(false); // case-sensitive
  });
});
