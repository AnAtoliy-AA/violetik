import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "./types";

export function cityForLocale(settings: SiteSettings, locale: Locale): string {
  const direct =
    locale === "ru"
      ? settings.cityRu
      : locale === "be"
        ? settings.cityBe
        : settings.cityEn;
  return direct || settings.cityEn;
}

export function addressForLocale(
  settings: SiteSettings,
  locale: Locale,
): string {
  const direct =
    locale === "ru"
      ? settings.addressRu
      : locale === "be"
        ? settings.addressBe
        : settings.addressEn;
  return direct || settings.addressEn;
}

/**
 * Composes the public-facing one-line address. Mirrors the home-footer
 * convention: `<address> · <city>` when a city is set, otherwise just
 * the address.
 */
export function studioLocationLine(
  settings: SiteSettings,
  locale: Locale,
): string {
  const address = addressForLocale(settings, locale);
  const city = cityForLocale(settings, locale);
  return city ? `${address} · ${city}` : address;
}
