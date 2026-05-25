import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { withDevTimeout } from "@/db/dev-timeout";
import type { Locale } from "@/i18n/routing";
import { HomeFooter } from "./home-footer";

export async function HomeFooterAsync({ locale }: { locale: Locale }) {
  const settings = await withDevTimeout(
    () => getSiteSettingsServer(),
    "home.siteSettings",
  );
  return <HomeFooter settings={settings} locale={locale} />;
}
