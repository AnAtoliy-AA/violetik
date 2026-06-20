"use client";

import { useEffect, useCallback } from "react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { usePageHeading } from "@/entities/page-seo";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/features/locale-switcher";
import { Aurora } from "@/shared/ui/aurora";
import { buttonClassName } from "@/shared/ui/button";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { FlameMonogram } from "@/shared/ui/flame-monogram";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { emitAnalytics } from "@/shared/lib/analytics/emit";
import { LetterReveal } from "./letter-reveal";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type WelcomeStatus =
  | { state: "open"; closesAt: string }
  | { state: "closed"; day: string; time: string }
  | { state: "no-hours" };

export interface WelcomePageProps {
  status?: WelcomeStatus;
}

export function WelcomePage({
  status = { state: "no-hours" },
}: WelcomePageProps = {}) {
  const t = useTranslations("Welcome");
  const heading = usePageHeading("welcome");
  const reduceMotion = useReducedMotion();

  const statusLabel =
    status.state === "open"
      ? t("status_open_until", { time: status.closesAt })
      : status.state === "closed"
        ? t("status_opens_on", { day: status.day, time: status.time })
        : null;
  const statusIsOpen = status.state === "open";

  // §16 — Phase 2 analytics. Fires once per mount; the emit helper is
  // SSR-safe and a no-op until window is available.
  useEffect(() => {
    emitAnalytics("welcome_landed");
  }, []);

  const fade = useCallback(
    (delay: number) => ({
      initial: reduceMotion ? false : { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT, delay },
    }),
    [reduceMotion],
  );

  const rise = useCallback(
    (delay: number) => ({
      initial: reduceMotion ? false : { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: reduceMotion ? 0 : 1.1, ease: EASE_OUT, delay },
    }),
    [reduceMotion],
  );

  return (
    <div className="relative min-h-dvh overflow-hidden px-[22px]">
      <Aurora intensity="vivid" />
      <PaperGrain />

      <m.div
        className="absolute top-5 right-[22px] z-20 flex items-center gap-2"
        {...fade(0.2)}
      >
        <Link
          href="/home"
          aria-label={t("home_link")}
          className="relative inline-flex size-7 items-center justify-center rounded-full border-[0.5px] border-line text-text-2 transition-colors duration-fast ease-out hover:text-text hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg before:absolute before:-inset-2 before:content-['']"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width={13}
            height={13}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10.5V20h14v-9.5" />
            <path d="M10 20v-5h4v5" />
          </svg>
        </Link>
        <LocaleSwitcher variant="welcome" />
      </m.div>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[420px] flex-col justify-between">
        <div className="pt-12 pb-8 text-center">
          <h1 className="font-display italic font-light tracking-[-0.03em] text-[clamp(72px,22vw,110px)] text-brand-cycle text-display-shadow">
            <LetterReveal text="Violetta" />
          </h1>

          <m.div
            className="mt-4 font-mono text-[11px] uppercase tracking-[0.48em] text-gold-shimmer"
            {...fade(0.9)}
          >
            B · E · A · U · T · Y
          </m.div>

          <m.div
            className="mx-auto mt-8 overflow-hidden"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: 160 }}
            transition={{
              duration: reduceMotion ? 0 : 1.5,
              ease: EASE_OUT,
              delay: 0.6,
            }}
          >
            <Ornament />
          </m.div>

          <m.div
            className="mx-auto mt-6 h-[220px] w-[170px]"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.92, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 1.4,
              ease: EASE_OUT,
              delay: 1.5,
            }}
          >
            <FlameMonogram letter="V" className="size-full" />
          </m.div>

          <m.p
            className="mx-auto mt-7 max-w-[300px] font-display text-[20px] font-light italic leading-[1.35] text-text-2"
            {...rise(2.0)}
          >
            {heading.title}
          </m.p>

          {statusLabel && (
            <m.div
              className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-text-3"
              {...fade(2.4)}
            >
              <span
                aria-hidden
                className={`inline-block size-1.5 rounded-full ${
                  statusIsOpen ? "bg-status-open" : "bg-accent"
                } motion-safe:animate-soft-pulse`}
              />
              <span>{statusLabel}</span>
            </m.div>
          )}
        </div>

        <m.div className="flex flex-col gap-3 pb-24" {...rise(2.2)}>
          <MagneticButton className="block w-full">
            <Link
              href="/onboarding"
              onClick={() => emitAnalytics("welcome_cta_step_inside")}
              className={buttonClassName({
                variant: "gold",
                size: "lg",
                block: true,
              })}
            >
              {t("cta_enter")}
            </Link>
          </MagneticButton>
          <Link
            href="/home"
            className={buttonClassName({
              variant: "outline",
              size: "lg",
              block: true,
            })}
          >
            {t("cta_main")}
          </Link>
          <Link
            href="/services"
            className={buttonClassName({
              variant: "outline",
              size: "lg",
              block: true,
            })}
          >
            {t("cta_services")}
          </Link>
        </m.div>
      </div>
    </div>
  );
}
