import { PALETTE_COOKIE, type PaletteId } from "./palettes";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persists the selected palette in a cookie and applies it to <html> via
 * the `data-palette` attribute so the CSS variables update immediately.
 *
 * Client-only: touches `document.cookie` and `document.documentElement`.
 */
export function writePaletteCookie(id: PaletteId): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PALETTE_COOKIE}=${id}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  document.documentElement.setAttribute("data-palette", id);
}
