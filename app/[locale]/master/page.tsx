import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  loadArtistWithPhoto,
  loadTestimonialsWithPhotos,
} from "@/entities/studio/api/load-with-photos";
import { MasterPage } from "@/views/master";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Master" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function MasterRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [artist, testimonials] = await Promise.all([
    loadArtistWithPhoto(),
    loadTestimonialsWithPhotos(),
  ]);
  return <MasterPage artist={artist} testimonials={testimonials} />;
}
