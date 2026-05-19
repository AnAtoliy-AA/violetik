import { setRequestLocale, getTranslations } from "next-intl/server";
import { ThemeSwitcher } from "@/features/theme-switcher";
import { LocaleSwitcher } from "@/features/locale-switcher";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <main className="p-8 flex flex-col gap-6">
      <h1 className="text-2xl">{t("greeting")}</h1>
      <div className="flex flex-wrap gap-4">
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
    </main>
  );
}
