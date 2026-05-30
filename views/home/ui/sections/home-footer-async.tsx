import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import type { Locale } from "@/i18n/routing";
import { HomeFooter } from "./home-footer";

export async function HomeFooterAsync({ locale }: { locale: Locale }) {
  // getSiteSettingsServer is already React.cache + withDevTimeout
  // wrapped; calling it bare here joins the layout's existing
  // per-request dedup instead of opening a second query path.
  const settings = await getSiteSettingsServer();
  return <HomeFooter settings={settings} locale={locale} />;
}
