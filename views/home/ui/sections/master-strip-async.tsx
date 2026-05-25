import { loadMastersForLocale } from "@/entities/master/api/load";
import type { Locale } from "@/i18n/routing";
import { MasterStrip } from "./master-strip";

export async function MasterStripAsync({ locale }: { locale: Locale }) {
  const masters = await loadMastersForLocale(locale, { publishedOnly: true });
  return <MasterStrip master={masters[0]} />;
}
