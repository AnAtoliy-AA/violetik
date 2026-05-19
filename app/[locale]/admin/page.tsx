import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { PaletteSwitcher } from "@/features/palette-switcher";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function AdminRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  return (
    <div className="pb-16">
      <AppHeader back="/home" title={t("plate_title")} />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      <section className="px-[22px] pt-2 pb-10">
        <PaletteSwitcher />
        <p className="mt-6 max-w-[420px] font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {t("persistence_note")}
        </p>
      </section>
    </div>
  );
}
