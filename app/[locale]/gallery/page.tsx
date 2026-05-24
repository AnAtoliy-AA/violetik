import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadGalleryWithPhotos } from "@/entities/studio/api/load-with-photos";
import { GalleryPage } from "@/views/gallery";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function GalleryRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [items, sessionUser] = await Promise.all([
    loadGalleryWithPhotos(),
    getCurrentSessionUser(),
  ]);
  return (
    <GalleryPage items={items} showAdmin={sessionUser?.role === "admin"} />
  );
}
