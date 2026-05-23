import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/entities/site-settings";
import { addressForLocale, cityForLocale } from "@/entities/site-settings";

export interface LocalBusinessJsonLdProps {
  settings: SiteSettings;
  locale: Locale;
  siteUrl: string;
  name: string;
}

export function LocalBusinessJsonLd({
  settings,
  locale,
  siteUrl,
  name,
}: LocalBusinessJsonLdProps) {
  const street = addressForLocale(settings, locale);
  const city = cityForLocale(settings, locale);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name,
    url: `${siteUrl}/${locale}`,
  };

  if (street && settings.country) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: street,
      ...(city ? { addressLocality: city } : {}),
      addressCountry: settings.country,
    };
  }

  if (settings.latitude != null && settings.longitude != null) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: settings.latitude,
      longitude: settings.longitude,
    };
  }

  // Escape `<` so a string containing `</script>` can't break out of the
  // inline JSON-LD block and execute as JS. JSON.parse still accepts the
  // resulting unicode-escaped form.
  const serialized = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
