import { useTranslations } from "next-intl";
import { Eyebrow } from "@/shared/ui/eyebrow";

/**
 * §8.4 — quiet "what it costs in time after" panel between the includes
 * list and the recent mini gallery. Pure i18n; expand/collapse is left
 * to the visitor via the browser <details> element so it stays
 * server-renderable and keyboard-accessible without JS.
 */
export function AftercareSection() {
  const t = useTranslations("ServiceDetail");

  return (
    <section className="mx-[22px] my-8 rounded-md border-[0.5px] border-line-strong/40 bg-bg/40 p-5">
      <details>
        <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
          <Eyebrow gold>—— {t("aftercare_eyebrow")}</Eyebrow>
          <span
            aria-hidden
            className="font-display italic text-text-3 text-lg group-open:hidden"
          >
            +
          </span>
        </summary>
        <p className="m-0 mt-3 font-display italic text-[15px] leading-snug text-text-2">
          {t("aftercare_body")}
        </p>
      </details>
    </section>
  );
}
