import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { Ornament } from "@/shared/ui/ornament";

export function HomeFooter() {
  const t = useTranslations("Home");
  return (
    <footer className="px-[22px] pb-7 pt-10 text-center text-text-3">
      <Ornament />
      <div className="mt-6 font-display text-[22px] font-light italic">
        Violetta.
      </div>
      <div className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.32em]">
        {STUDIO_DATA.studio.address}
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.32em]">
        {t("footer_copyright")}
      </div>
    </footer>
  );
}
