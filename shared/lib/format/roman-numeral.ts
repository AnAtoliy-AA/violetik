/**
 * Tiny Roman-numeral formatter used by testimonial date eyebrows.
 * Range covers 1–3999 (per RFC 3066 conventions); years outside that
 * fall back to the Western digit form. Roman numerals are universal
 * across locales, so this lets us format `· МАРТ MMXXIV ·` for ru
 * without forking copy.
 */
const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRomanNumeral(n: number): string {
  if (!Number.isFinite(n) || n < 1 || n > 3999) return String(n);
  let value = Math.floor(n);
  let out = "";
  for (const [num, glyph] of ROMAN) {
    while (value >= num) {
      out += glyph;
      value -= num;
    }
  }
  return out;
}
