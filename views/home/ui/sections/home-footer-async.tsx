import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import type { Locale } from "@/i18n/routing";
import { HomeFooter } from "./home-footer";

export async function HomeFooterAsync({ locale }: { locale: Locale }) {
  const settings = await getSiteSettingsServer();
  return <HomeFooter settings={settings} locale={locale} />;
}
