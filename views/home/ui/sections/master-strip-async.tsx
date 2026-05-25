import { loadMastersForLocale } from "@/entities/master/api/load";
import { withDevTimeout } from "@/db/dev-timeout";
import type { Locale } from "@/i18n/routing";
import { MasterStrip } from "./master-strip";

export async function MasterStripAsync({ locale }: { locale: Locale }) {
  const masters = await withDevTimeout(
    () => loadMastersForLocale(locale, { publishedOnly: true }),
    "home.mastersForLocale",
  );
  return <MasterStrip master={masters[0]} />;
}
