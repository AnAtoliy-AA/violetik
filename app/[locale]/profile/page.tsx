import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ProfilePage } from "@/views/profile";
import { buildPageMetadata } from "@/shared/lib/page-metadata";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, pageId: "profile", path: "/profile" });
}

export default async function ProfileRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfilePage locale={locale} />;
}
