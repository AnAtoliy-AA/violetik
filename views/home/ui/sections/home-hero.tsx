"use client";

import { useRef } from "react";
import {
  m,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { FlameMonogram } from "@/shared/ui/flame-monogram";

export function HomeHero() {
  const t = useTranslations("Home");
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const heroY = useTransform(scrollY, [0, 500], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 320], [1, 0]);
  const fanY = useTransform(scrollY, [0, 500], [0, 125]);
  const fanOpacity = useTransform(scrollY, [0, 320], [0.65, 0]);

  const styledHero = reduceMotion
    ? undefined
    : { y: heroY, opacity: heroOpacity };
  const styledFan = reduceMotion
    ? { opacity: 0.65 }
    : { y: fanY, opacity: fanOpacity };

  const wordRef = useRef<HTMLSpanElement>(null);
  // `once: true` latches the boolean after the first intersection, so it acts
  // as a one-way reveal flag without a separate piece of state.
  const wordRevealed = useInView(wordRef, { amount: 0.6, once: true });

  return (
    <div className="relative">
      {/* Aurora + PaperGrain live on the parent <section> now so they bleed
       * to the section's full width (including the padding zone) rather than
       * being clipped to this inner content box. */}
      {/* Text block stays in a narrow column on the left so the title +
       * paragraph remain readable on wide viewports. The FlameMonogram below
       * anchors to this full-width relative container so its `-right-10` puts
       * it at the section's right edge (inset by the section's padding). */}
      <m.div
        className="relative z-10 mt-9 max-w-[760px]"
        style={styledHero}
      >
        <Eyebrow>—— {t("hero_cover_story")}</Eyebrow>
        <h1 className="mt-4 font-display text-h1 font-light italic leading-[0.92] tracking-[-0.025em] sm:leading-[0.94]">
          {t("hero_title_line_1")}
          <br />
          <span className="font-normal not-italic text-text-2">
            {t("hero_title_lead")}{" "}
          </span>
          <span
            ref={wordRef}
            data-revealed={wordRevealed ? "true" : undefined}
            className="stroke-draw text-gold-shimmer font-normal"
          >
            {t("hero_title_word")}
          </span>
        </h1>
        <LetterpressRule className="mt-5 max-w-[440px]" />
        <p className="dropcap mt-6 max-w-[540px] text-[14.5px] leading-[1.55] text-text-2">
          {t("hero_paragraph")}
        </p>
        <div className="mt-7 flex gap-2.5">
          <MagneticButton>
            <Link
              href="/services"
              className={buttonClassName({ variant: "gold", size: "md" })}
            >
              {t("cta_book")}
            </Link>
          </MagneticButton>
          <Link
            href="/gallery"
            className={buttonClassName({ variant: "outline", size: "md" })}
          >
            {t("cta_gallery")}
          </Link>
        </div>
      </m.div>

      <m.div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-[60px] z-0 hidden h-[250px] w-[190px] sm:block"
        style={styledFan}
      >
        <FlameMonogram />
      </m.div>
    </div>
  );
}
