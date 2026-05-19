export interface Palette {
  /** Stable id used as the `data-palette` attribute value and cookie value. */
  id: string;
  /** Display name (English; switcher translates via PaletteSwitcher.palettes.<id>). */
  name: string;
  /** Three colors for a swatch preview: [bg, surface, accent]. */
  preview: readonly [string, string, string];
}

/**
 * The 12 palettes available in the studio admin. Each palette has a matching
 * CSS block in app/globals.css using a `[data-palette="<id>"]` selector that
 * overrides the @theme color tokens. The `aubergine` palette is the default
 * and its values live directly in @theme — there is no override block for it.
 */
export const PALETTES = [
  { id: "aubergine", name: "Aubergine", preview: ["#100612", "#1f0e25", "#c9a96e"] },
  { id: "rose", name: "Rose", preview: ["#1e0d18", "#2a1226", "#e8b08c"] },
  { id: "lilac", name: "Lilac", preview: ["#1a1226", "#2a1838", "#e0c4f3"] },
  { id: "mono", name: "Mono", preview: ["#0d0a0f", "#1a1620", "#d4c9b8"] },
  { id: "ink", name: "Ink", preview: ["#0a0f1f", "#152033", "#9fb4d8"] },
  { id: "moss", name: "Moss", preview: ["#0d130f", "#172218", "#a8c098"] },
  { id: "bronze", name: "Bronze", preview: ["#150e08", "#241a10", "#d4a574"] },
  { id: "pearl", name: "Pearl", preview: ["#1a1612", "#28221c", "#f0e3cf"] },
  { id: "emerald", name: "Emerald", preview: ["#06120c", "#0f2018", "#7ec699"] },
  { id: "sapphire", name: "Sapphire", preview: ["#06101c", "#0f1c30", "#7da3d0"] },
  { id: "ruby", name: "Ruby", preview: ["#1a070b", "#2b0f15", "#d97b8a"] },
  { id: "obsidian", name: "Obsidian", preview: ["#050505", "#121212", "#c2c2c2"] },
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE_ID: PaletteId = "aubergine";

export const PALETTE_COOKIE = "vio-palette";

export function isPaletteId(value: unknown): value is PaletteId {
  return (
    typeof value === "string" && PALETTES.some((p) => p.id === value)
  );
}

export function paletteById(id: string | null | undefined): Palette {
  if (isPaletteId(id)) {
    return PALETTES.find((p) => p.id === id)!;
  }
  return PALETTES[0];
}
