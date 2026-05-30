import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { extractPalette } from "./extract-palette";

async function solidColor(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: {
      width: 16,
      height: 16,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

async function halfAndHalf(): Promise<Buffer> {
  // Top half pure red, bottom half pure blue.
  const red = await solidColor({ r: 255, g: 0, b: 0 });
  const blue = await solidColor({ r: 0, g: 0, b: 255 });
  // Stack vertically.
  const stacked = await sharp({
    create: { width: 16, height: 32, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: red, top: 0, left: 0 },
      { input: blue, top: 16, left: 0 },
    ])
    .png()
    .toBuffer();
  return stacked;
}

describe("extractPalette", () => {
  it("returns the dominant color for a solid-colour buffer", async () => {
    const buf = await solidColor({ r: 200, g: 50, b: 100 });
    const palette = await extractPalette(buf, { count: 1 });
    expect(palette).toHaveLength(1);
    // Quantisation drops the lowest 3 bits, so colors are approximate
    // but should be in the right ballpark.
    const [hex] = palette!;
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const r = parseInt(hex.slice(1, 3), 16);
    expect(Math.abs(r - 200)).toBeLessThan(12);
  });

  it("picks up the top-N hues from a mixed image", async () => {
    const buf = await halfAndHalf();
    const palette = await extractPalette(buf, { count: 2 });
    expect(palette).toHaveLength(2);
    // Both red-ish and blue-ish should appear in the top two.
    const hasRedish = palette!.some((c) => {
      const r = parseInt(c.slice(1, 3), 16);
      const b = parseInt(c.slice(5, 7), 16);
      return r > 100 && b < 50;
    });
    const hasBluish = palette!.some((c) => {
      const r = parseInt(c.slice(1, 3), 16);
      const b = parseInt(c.slice(5, 7), 16);
      return b > 100 && r < 50;
    });
    expect(hasRedish).toBe(true);
    expect(hasBluish).toBe(true);
  });
});
