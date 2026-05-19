import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { Plate } from "@/shared/ui/plate";

export function TestimonialCard() {
  const t = useTranslations("Home");
  const item = STUDIO_DATA.testimonials[0];
  return (
    <section className="px-[22px] py-7">
      <Plate number={3} label={t("plate_word").toUpperCase()} />
      <div
        className="relative mt-4 overflow-hidden rounded-[28px] border-[0.5px] border-line px-7 py-9"
        style={{
          background:
            "linear-gradient(140deg, color-mix(in oklab, var(--color-plum) 38%, var(--color-surface)) 0%, var(--color-surface) 70%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2.5 -top-[50px] select-none font-display text-[200px] font-light italic leading-none"
          style={{ color: "color-mix(in oklab, var(--color-accent) 22%, transparent)" }}
        >
          &ldquo;
        </span>
        <p className="m-0 mb-5 font-display text-[24px] font-normal italic leading-[1.3]">
          {item.text}
        </p>
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
