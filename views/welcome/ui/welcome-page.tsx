"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { NailFan } from "@/shared/ui/nail-fan";
import { Ornament } from "@/shared/ui/ornament";
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
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-[120px] -top-[100px] size-[360px] rounded-full blur-[60px]"
        style={{ background: "radial-gradient(circle, var(--color-plum), transparent 70%)" }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: reduceMotion ? 0 : 1.4, ease: EASE_OUT, delay: 0.35 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-[180px] -left-[140px] size-[420px] rounded-full blur-[60px]"
        style={{ background: "radial-gradient(circle, var(--color-violet), transparent 70%)" }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: reduceMotion ? 0 : 1.8, ease: EASE_OUT, delay: 0.55 }}
      />

      <div className="flex min-h-dvh flex-col justify-between">
        <div className="py-8 text-center">
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
            className="mx-auto mt-[30px] h-[150px] w-[240px]"
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 0.92, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: EASE_OUT, delay: 1.9 }}
          >
            <NailFan
              palette={["#c9a96e", "#7d3a6f"]}
              className="size-full"
            />
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
          <Link
            href="/onboarding"
            className={buttonClassName({ variant: "gold", size: "lg", block: true })}
          >
            {t("cta_enter")}
          </Link>
          <Link
            href="/home"
            className={buttonClassName({ variant: "ghost", size: "lg", block: true })}
          >
            {t("cta_returning")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
