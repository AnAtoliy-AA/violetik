import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "by"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

/**
 * Maps internal locale identifiers to valid BCP-47 language tags for
 * <html lang> and hreflang. `by` is an ISO 3166 country code and is
 * invalid as a language tag; emit `be-BY` instead.
 */
export const LOCALE_TO_LANG: Record<Locale, string> = {
  en: "en",
  ru: "ru",
  by: "be-BY",
};
