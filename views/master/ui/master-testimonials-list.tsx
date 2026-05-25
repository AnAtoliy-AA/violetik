import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ApprovedTestimonial } from "@/entities/testimonial/model/types";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { VipBadge } from "@/shared/ui/vip-badge";

export function MasterTestimonialsList({
  testimonials,
}: {
  testimonials: readonly ApprovedTestimonial[];
}) {
  const t = useTranslations("Master");
  if (testimonials.length === 0) return null;
  return (
    <section className="px-[22px] pb-7">
      <Eyebrow>{t("voices_eyebrow")}</Eyebrow>
      <div className="mt-4 flex flex-col gap-3.5">
        {testimonials.map((tm) => (
          <SpotlightCard
            key={tm.id}
            className="gilded glass-top rounded-[18px] p-[18px]"
          >
            <p className="m-0 mb-3 font-display text-[18px] font-normal italic leading-[1.35]">
              &ldquo;{tm.body}&rdquo;
            </p>
            <LetterpressRule className="mb-3 max-w-[140px]" />
            <div className="flex items-center gap-2.5">
              {tm.authorPhotoUrl ? (
                <span className="relative size-[22px] overflow-hidden rounded-full">
                  <Image
                    src={tm.authorPhotoUrl}
                    alt={tm.authorDisplay}
                    fill
                    sizes="22px"
                    unoptimized
                    className="object-cover"
                  />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="size-[22px] rounded-full"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-rose) 60%, var(--color-accent))",
                  }}
                />
              )}
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-medium">{tm.authorDisplay}</span>
                {tm.authorIsVip ? <VipBadge size="xs" /> : null}
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}
