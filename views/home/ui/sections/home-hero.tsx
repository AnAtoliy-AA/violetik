"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailFan } from "@/shared/ui/nail-fan";
import { PaperGrain } from "@/shared/ui/paper-grain";

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

  return (
    <div className="relative">
      <PaperGrain />
      <motion.div
        className="relative z-10 mt-9 max-w-[calc(100%-120px)]"
        style={styledHero}
      >
        <Eyebrow>—— {t("hero_cover_story")}</Eyebrow>
        <h1 className="mt-4 font-display text-[clamp(56px,16vw,76px)] font-light italic leading-[0.94] tracking-[-0.025em]">
          {t("hero_title_line_1")}
          <br />
          <span className="font-normal not-italic text-text-2">
            {t("hero_title_lead")}{" "}
          </span>
          <span className="text-gold-shimmer font-normal">
            {t("hero_title_word")}
          </span>
        </h1>
        <LetterpressRule className="mt-5 max-w-[260px]" />
        <p className="dropcap mt-6 max-w-[320px] text-[14.5px] leading-[1.55] text-text-2">
          {t("hero_paragraph")}
        </p>
        <div className="mt-7 flex gap-2.5">
          <Link
            href="/services"
            className={buttonClassName({ variant: "gold", size: "md" })}
          >
            {t("cta_book")}
          </Link>
          <Link
            href="/gallery"
            className={buttonClassName({ variant: "outline", size: "md" })}
          >
            {t("cta_gallery")}
          </Link>
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-[60px] z-0 h-[250px] w-[190px] rotate-[10deg]"
        style={styledFan}
      >
        <NailFan palette={["#c9a96e", "#7d3a6f"]} className="size-full" />
      </motion.div>
    </div>
  );
}
