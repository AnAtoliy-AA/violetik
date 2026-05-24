import { setRequestLocale } from "next-intl/server";
import { ProfileNotificationsPage } from "@/views/profile-notifications";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileNotificationsPage locale={locale} />;
}
