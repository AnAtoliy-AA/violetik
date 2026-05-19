import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { DEFAULT_PALETTE_ID, PALETTE_COOKIE } from "@/shared/config/palettes";
import "../globals.css";

/**
 * Inline init script. Runs synchronously before the body paints to swap
 * <html data-palette="…"> from the cookie value when present. Keeps the
 * locale layout fully static (no cookies() on the server) while avoiding
 * a flash of the wrong palette on returning admin sessions.
 */
const PALETTE_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/${PALETTE_COOKIE}=([^;]+)/);if(m&&m[1]){document.documentElement.setAttribute("data-palette",m[1])}}catch(e){}})()`;

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

export const metadata: Metadata = {
  title: "violetik",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

  return (
    <html
      lang={locale}
      data-palette={DEFAULT_PALETTE_ID}
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PALETTE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
