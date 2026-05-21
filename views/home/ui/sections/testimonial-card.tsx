import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";

export function TestimonialCard() {
  const t = useTranslations("Home");
  const item = STUDIO_DATA.testimonials[0];
  return (
    <section className="px-[22px] py-7">
      <Plate number={3} label={t("plate_word").toUpperCase()} />
      <div className="gilded glass-top relative mt-4 overflow-hidden rounded-[28px] px-7 py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 top-1.5 select-none font-display text-[140px] font-light italic leading-none text-gold"
        >
          &ldquo;
        </div>
        <p className="m-0 mb-5 pl-12 font-display text-[26px] font-normal italic leading-[1.3]">
          {item.text}
        </p>
        <LetterpressRule className="mb-4 max-w-[200px]" />
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-7 rounded-full border-[0.5px] border-accent"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, var(--color-rose), var(--color-plum))",
            }}
          />
          <div>
            <div className="text-[13px] font-medium">{item.name}</div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
              {item.role}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
