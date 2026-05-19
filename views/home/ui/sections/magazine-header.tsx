import { useTranslations } from "next-intl";

export function MagazineHeader() {
  const t = useTranslations("Home");
  return (
    <div className="flex justify-between border-b-[0.5px] border-line-strong pb-3.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
      <span>{t("magazine_volume")}</span>
      <span className="text-accent">{t("magazine_season")}</span>
      <span>{t("magazine_location")}</span>
    </div>
  );
}
