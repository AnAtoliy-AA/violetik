import { describe, it, expect } from "vitest";
import { toRomanNumeral } from "./roman-numeral";

describe("toRomanNumeral", () => {
  it("formats common years correctly", () => {
    expect(toRomanNumeral(2024)).toBe("MMXXIV");
    expect(toRomanNumeral(2025)).toBe("MMXXV");
    expect(toRomanNumeral(1999)).toBe("MCMXCIX");
  });

  it("falls back to digits for out-of-range or invalid inputs", () => {
    expect(toRomanNumeral(0)).toBe("0");
    expect(toRomanNumeral(4000)).toBe("4000");
    expect(toRomanNumeral(Number.NaN)).toBe("NaN");
  });

  it("handles single-digit edges", () => {
    expect(toRomanNumeral(1)).toBe("I");
    expect(toRomanNumeral(4)).toBe("IV");
    expect(toRomanNumeral(9)).toBe("IX");
  });
});
