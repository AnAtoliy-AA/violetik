"use client";

import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { usePageHeading } from "@/entities/page-seo";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { FlameMonogram } from "@/shared/ui/flame-monogram";

export function HomeHero() {
  const t = useTranslations("Home");
  const heading = usePageHeading("home");
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

  return (
    <div className="relative">
      <m.div
        className="relative z-10 mt-10 max-w-[760px]"
        style={styledHero}
      >
        <Eyebrow>—— {t("hero_cover_story")}</Eyebrow>
        <h1 className="mt-4 font-display text-h1 font-light italic leading-[0.92] tracking-[-0.03em] sm:leading-[0.94] text-display-shadow">
          {heading.title}
        </h1>
        <LetterpressRule className="mt-5 max-w-[440px]" />
        <p className="dropcap mt-6 max-w-[540px] text-[14.5px] leading-[1.55] text-text-2">
          {heading.description}
        </p>
        <div className="mt-8 flex gap-2.5">
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
