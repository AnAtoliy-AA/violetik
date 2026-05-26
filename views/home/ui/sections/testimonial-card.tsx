import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ApprovedTestimonial } from "@/entities/testimonial";
import { toRomanNumeral } from "@/shared/lib/format/roman-numeral";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { VipBadge } from "@/shared/ui/vip-badge";

export interface TestimonialCardProps {
  testimonial: ApprovedTestimonial | null;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const t = useTranslations("Home");
  const locale = useLocale();
  if (!testimonial) return null;
  // §11.2 — mono caps date eyebrow under each quote, e.g.
  // "· МАРТ MMXXIV ·". Month follows the locale; year is Roman so it
  // reads as editorial flair across all three locales.
  const dateMonth = new Intl.DateTimeFormat(locale, { month: "long" })
    .format(testimonial.createdAt)
    .toUpperCase();
  const dateYear = toRomanNumeral(testimonial.createdAt.getFullYear());
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
        <p className="m-0 mb-3 pl-12 font-display text-[26px] font-normal italic leading-[1.3]">
          {testimonial.body}
        </p>
        <div className="mb-3 pl-12 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
          · {dateMonth} {dateYear} ·
        </div>
        <LetterpressRule className="mb-4 max-w-[200px]" />
        <div className="flex items-center gap-2.5">
          {testimonial.authorPhotoUrl ? (
            <span className="relative size-7 overflow-hidden rounded-full border-[0.5px] border-accent">
              <Image
                src={testimonial.authorPhotoUrl}
                alt={testimonial.authorDisplay}
                fill
                sizes="28px"
                unoptimized
                className="object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden
              className="size-7 rounded-full border-[0.5px] border-accent"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, var(--color-rose), var(--color-plum))",
              }}
            />
          )}
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-medium">{testimonial.authorDisplay}</div>
            {testimonial.authorIsVip ? <VipBadge size="xs" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
