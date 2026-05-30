import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadGallery } from "@/entities/gallery/api/load";
import { GalleryPage } from "@/views/gallery";
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
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return buildPageMetadata({
    locale,
    pageId: "gallery",
    path: "/gallery",
    fallbackTitle: `Violetta — ${t("meta_title")}`,
  });
}

export default async function GalleryRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [{ categories, items }, sessionUser] = await Promise.all([
    loadGallery(locale as Locale),
    getCurrentSessionUser(),
  ]);
  return (
    <GalleryPage
      categories={categories}
      items={items}
      showAdmin={sessionUser?.role === "admin"}
    />
  );
}
