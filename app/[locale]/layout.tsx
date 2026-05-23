import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, LOCALE_TO_LANG } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { cityForLocale } from "@/entities/site-settings";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { LocalBusinessJsonLd } from "@/shared/ui/local-business-jsonld";
import { SiteFooter } from "@/widgets/site-footer";
import "../globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://violetta.example.com";

const OG_LOCALE: Record<string, string> = {
  en: "en_US",
  ru: "ru_RU",
  by: "be_BY",
};

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--next-font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--next-font-dm-sans",
  display: "swap",
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--next-font-jetbrains",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#100612",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site" });
  const settings = await getSiteSettingsServer();
  const typedLocale = locale as Locale;
  // cityForLocale falls back to cityEn when the locale-specific city is
  // empty — intentional, so admin can ship city-driven SEO before
  // translating the city name into RU/BE. The admin form prompts for
  // all three locales to keep copy idiomatic.
  const city = cityForLocale(settings, typedLocale);

  const baseName = t("name");
  const baseDescription = t("description");
  const title = city ? t("meta_title_with_city", { city }) : baseName;
  const description = city
    ? t("meta_description_with_city", { city })
    : baseDescription;
  const keywords = city ? t("meta_keywords_with_city", { city }) : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords,
    manifest: "/manifest.webmanifest",
    openGraph: {
      title,
      description,
      type: "website",
      siteName: baseName,
      locale: OG_LOCALE[locale] ?? OG_LOCALE.en,
      url: `${SITE_URL}/${locale}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [LOCALE_TO_LANG[l], `${SITE_URL}/${l}`]),
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const tSite = await getTranslations({ locale, namespace: "Site" });
  const settings = await getSiteSettingsServer();

  return (
    <html
      lang={LOCALE_TO_LANG[locale as Locale]}
      data-palette={settings.defaultPalette}
      className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocalBusinessJsonLd
          settings={settings}
          locale={locale as Locale}
          siteUrl={SITE_URL}
          name={tSite("name")}
        />
        <NextIntlClientProvider>
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
