import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HomePage } from "@/views/home";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { buildPageMetadata } from "@/shared/lib/page-metadata";
import type { Locale } from "@/i18n/routing";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return buildPageMetadata({
    locale,
    pageId: "home",
    path: "/home",
    fallbackTitle: `Violetta — ${t("meta_title")}`,
  });
}

export default async function HomeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sessionUser = await getCurrentSessionUser();
  return (
    <HomePage
      locale={locale as Locale}
      showAdmin={sessionUser?.role === "admin"}
    />
  );
}
