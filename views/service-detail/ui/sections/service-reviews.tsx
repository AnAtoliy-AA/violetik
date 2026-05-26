import { useLocale, useTranslations } from "next-intl";
import type { ApprovedTestimonial } from "@/entities/testimonial";
import { toRomanNumeral } from "@/shared/lib/format/roman-numeral";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Marquee } from "@/shared/ui/marquee";
import { Stamp } from "@/shared/ui/stamp";

export interface ServiceReviewsProps {
  reviews: readonly ApprovedTestimonial[];
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "·";
}

export function ServiceReviews({ reviews }: ServiceReviewsProps) {
  const t = useTranslations("ServiceDetail");
  const locale = useLocale();
  if (reviews.length === 0) return null;
  return (
    <section className="px-[22px] py-7">
      <Eyebrow>{t("reviews_eyebrow")}</Eyebrow>
      <LetterpressRule className="mt-3" />
      <Marquee className="mt-4" gap="1rem" duration="55s">
        {reviews.map((r) => {
          const month = new Intl.DateTimeFormat(locale, { month: "short" })
            .format(r.createdAt)
            .toUpperCase();
          const year = toRomanNumeral(r.createdAt.getFullYear());
          return (
          <article
            key={r.id}
            className="gilded glass-top flex w-[280px] shrink-0 flex-col gap-2 rounded-[14px] p-4"
          >
            <p
              className="m-0 line-clamp-2 font-display text-[14.5px] italic leading-[1.45] text-text"
              title={r.body}
            >
              &ldquo;{r.body}&rdquo;
            </p>
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
              · {month} {year} ·
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex size-7 items-center justify-center rounded-full border-[0.5px] border-accent/60 font-display text-[13px] italic text-gold"
              >
                {initialOf(r.authorDisplay)}
              </span>
              <span className="truncate font-mono text-[9px] uppercase tracking-[0.28em] text-text-2">
                {r.authorDisplay}
              </span>
              {r.authorIsVip ? (
                <Stamp size="sm" className="ml-auto">
                  {t("reviews_verified")}
                </Stamp>
              ) : null}
            </div>
          </article>
          );
        })}
      </Marquee>
    </section>
  );
}
