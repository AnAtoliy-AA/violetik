import type { CurrencyCode } from "@/db/schema";
import type { PaletteId } from "@/shared/config/palettes";
import type { Locale } from "@/i18n/routing";

export type PriceOverrideKey = `service:${string}` | "membership:VIP";

export interface SiteSettings {
  defaultPalette: PaletteId;
  defaultLocale: Locale;
  priceOverrides: Readonly<Record<string, number>>;
  discountPercent: number;
  discountActive: boolean;
  currency: CurrencyCode;
  updatedAt: string;
}

export interface ResolvedPrice {
  base: number;
  effective: number;
  hasDiscount: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  defaultPalette: "aubergine" as PaletteId,
  defaultLocale: "en" as Locale,
  priceOverrides: Object.freeze({}),
  discountPercent: 0,
  discountActive: false,
  currency: "EUR" as CurrencyCode,
  updatedAt: new Date(0).toISOString(),
});
