"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Aurora } from "@/shared/ui/aurora";
import { buttonClassName } from "@/shared/ui/button";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { FlameMonogram } from "@/shared/ui/flame-monogram";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { LetterReveal } from "./letter-reveal";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function WelcomePage() {
  const t = useTranslations("Welcome");
  const reduceMotion = useReducedMotion();

  const fade = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT, delay },
  });

  const rise = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 1.1, ease: EASE_OUT, delay },
  });

  return (
    <div className="relative min-h-dvh overflow-hidden px-[22px]">
      <Aurora intensity="vivid" />
      <PaperGrain />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[420px] flex-col justify-between">
        <div className="py-8 text-center">
          <motion.div
            className="mb-6 flex justify-center"
            {...fade(0.3)}
          >
            <MonogramSeal letter="V" className="size-12 text-[22px]" />
          </motion.div>
          <div className="font-display italic font-light tracking-[-0.025em] text-[clamp(72px,22vw,110px)]">
            <LetterReveal text="Violetta" />
          </div>

          <motion.div
            className="mt-[14px] font-mono text-[11px] uppercase tracking-[0.48em] text-gold-shimmer"
            {...fade(0.9)}
          >
            B · E · A · U · T · Y
          </motion.div>

          <motion.div
            className="mx-auto mt-[34px] overflow-hidden"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: 180 }}
            transition={{ duration: reduceMotion ? 0 : 1.5, ease: EASE_OUT, delay: 0.6 }}
          >
            <Ornament />
          </motion.div>

          <motion.div
            className="mx-auto mt-[30px] h-[250px] w-[190px]"
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 0.92, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: EASE_OUT, delay: 1.9 }}
          >
            <FlameMonogram letter="V" className="size-full" />
          </motion.div>

          <motion.p
            className="mx-auto mt-8 max-w-[320px] font-display text-[22px] font-light italic leading-[1.3] text-text-2"
            {...rise(2.2)}
          >
            {t("tagline")}
          </motion.p>
        </div>

        <motion.div
          className="flex flex-col gap-3 pb-9"
          {...rise(2.4)}
        >
          <MagneticButton className="block w-full">
            <Link
              href="/onboarding"
              className={buttonClassName({ variant: "gold", size: "lg", block: true })}
            >
              {t("cta_enter")}
            </Link>
          </MagneticButton>
          <Link
            href="/booking/service"
            className={buttonClassName({ variant: "ghost", size: "lg", block: true })}
          >
            {t("cta_returning")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
