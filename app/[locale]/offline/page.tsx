import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Ornament } from "@/shared/ui/ornament";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Notifications" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <Ornament className="mx-auto w-[180px] text-accent" />
      <h1 className="font-display text-h2 italic">{t("offline_title")}</h1>
      <p className="max-w-prose font-display italic text-[18px] leading-[1.5] text-text-2">
        {t("offline_body")}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-text-3">
        {t("offline_brand_line")}
      </p>
    </main>
  );
}
