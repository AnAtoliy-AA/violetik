import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";

export const metadata: Metadata = { title: "Violetta — Not found" };

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-[22px] text-center">
      <Eyebrow gold>{t("plate_404")}</Eyebrow>
      <h1 className="my-5 max-w-[420px] font-display text-[44px] font-light italic leading-[1.04] tracking-[-0.02em]">
        {t.rich("title", { br: () => <br /> })}
      </h1>
      <p className="max-w-md text-[14px] leading-relaxed text-text-2">
        {t("paragraph")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/welcome" className={buttonClassName({ variant: "gold" })}>
          {t("cta_home")}
        </Link>
        <Link
          href="/services"
          className={buttonClassName({ variant: "outline" })}
        >
          {t("cta_services")}
        </Link>
      </div>
    </main>
  );
}
