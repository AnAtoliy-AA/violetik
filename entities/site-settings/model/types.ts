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
  addressEn: string;
  addressRu: string;
  addressBe: string;
  country: string;
  cityEn: string;
  cityRu: string;
  cityBe: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  mapVisible: boolean;
  telegramUsername: string | null;
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
  addressEn: "By appointment · Verbena Lane 14, Studio B",
  addressRu: "По записи · Verbena Lane 14, Studio B",
  addressBe: "Па запісу · Verbena Lane 14, Studio B",
  country: "BY",
  cityEn: "",
  cityRu: "",
  cityBe: "",
  timezone: "Europe/Minsk",
  latitude: null,
  longitude: null,
  mapVisible: false,
  telegramUsername: null,
  updatedAt: new Date(0).toISOString(),
});
