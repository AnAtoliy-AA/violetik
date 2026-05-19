import { describe, it, expect } from "vitest";
import {
  DEFAULT_PALETTE_ID,
  PALETTES,
  isPaletteId,
  paletteById,
} from "./palettes";

describe("palettes registry", () => {
  it("has at least ten palettes", () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(10);
  });

  it("palette ids are unique", () => {
    const ids = PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each palette has a 3-color preview tuple", () => {
    for (const palette of PALETTES) {
      expect(palette.preview).toHaveLength(3);
      for (const color of palette.preview) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("the default palette id resolves to a real palette", () => {
    expect(PALETTES.some((p) => p.id === DEFAULT_PALETTE_ID)).toBe(true);
  });

  it("isPaletteId narrows correctly", () => {
    expect(isPaletteId("aubergine")).toBe(true);
    expect(isPaletteId("nonsense")).toBe(false);
    expect(isPaletteId(undefined)).toBe(false);
    expect(isPaletteId(42)).toBe(false);
  });

  it("paletteById falls back to the default when the id is unknown", () => {
    expect(paletteById("aubergine").id).toBe("aubergine");
    expect(paletteById("not-real").id).toBe(DEFAULT_PALETTE_ID);
    expect(paletteById(null).id).toBe(DEFAULT_PALETTE_ID);
  });
});
