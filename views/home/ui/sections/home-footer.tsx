import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/entities/site-settings";
import { studioLocationLine } from "@/entities/site-settings";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { Ornament } from "@/shared/ui/ornament";
import { StudioMap } from "@/widgets/studio-map";

export interface HomeFooterProps {
  settings: SiteSettings;
  locale: Locale;
}

export function HomeFooter({ settings, locale }: HomeFooterProps) {
  const t = useTranslations("Home");
  const tFooter = useTranslations("Footer");

  const addressLine = studioLocationLine(settings, locale);

  return (
    <footer className="px-[22px] pb-7 pt-10 text-center text-text-3">
      <Ornament />
      <div className="mt-6 flex flex-col items-center gap-3">
        <MonogramSeal letter="V" className="size-10 text-[20px]" />
        <div className="font-display text-[22px] font-light italic">
          Violetta.
        </div>
      </div>
      <StudioMap
        settings={settings}
        dictionary={{
          mapAria: tFooter("map_aria"),
          mapTitle: tFooter("map_title"),
          getDirections: tFooter("get_directions"),
        }}
      />
      <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.32em]">
        {addressLine}
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.32em]">
        {t("footer_copyright")}
      </div>
    </footer>
  );
}
