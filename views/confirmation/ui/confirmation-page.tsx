"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA } from "@/entities/studio";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { StatusBar } from "@/shared/ui/status-bar";
import { formatLongDate } from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";
import { ConfettiBurst } from "./confetti-burst";
import { GoldenSeal } from "./golden-seal";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

function buildReservationCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const four = Math.abs(hash % 9000) + 1000;
  return `VB-${four}`;
}

export function ConfirmationPage() {
  const t = useTranslations("Confirmation");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  const serviceId = useBookingStore((s) => s.serviceId);
  const date = useBookingStore((s) => s.date);
  const time = useBookingStore((s) => s.time);

  const service =
    STUDIO_DATA.services.find((s) => s.id === serviceId) ??
    STUDIO_DATA.services[0];
  const dateLabel = date ? formatLongDate(date, locale) : t("missing_date");
  const timeLabel = time ?? t("missing_time");
  const code = useMemo(
    () =>
      buildReservationCode(
        `${serviceId ?? "x"}|${date ?? "x"}|${time ?? "x"}`,
      ),
    [serviceId, date, time],
  );

  const rows: readonly [string, string][] = [
    [t("row_date"), dateLabel],
    [t("row_time"), timeLabel],
    [t("row_where"), STUDIO_DATA.studio.address],
    [t("row_duration"), service.duration],
  ];

  return (
    <div className="relative px-[22px] pb-9">
      <ConfettiBurst />
      <StatusBar />
      <div className="pt-10 text-center">
        <GoldenSeal />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT, delay: 0.9 }}
          className="mt-7"
        >
          <Eyebrow gold>
            {t("reserved_eyebrow", { code })}
          </Eyebrow>
          <h1 className="my-3 mb-1.5 font-display text-[44px] font-normal italic leading-tight tracking-[-0.02em]">
            {t.rich("title", { br: () => <br /> })}
          </h1>
          <p className="mx-auto mt-2.5 max-w-[320px] text-[14px] text-text-2">
            {t("subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT, delay: 1.5 }}
          className="relative mt-8 overflow-hidden rounded-[28px] border-[0.5px] border-accent p-[22px] text-left"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--color-plum) 30%, var(--color-surface)) 0%, var(--color-surface) 80%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-10 size-[160px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 24%, transparent), transparent 70%)",
            }}
          />
          <Eyebrow gold>{t("card_eyebrow")}</Eyebrow>
          <h3 className="my-2 mb-3.5 font-display text-[26px] font-normal italic">
            {service.name}
          </h3>
          {rows.map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-center justify-between gap-2 py-2.5 ${
                i < rows.length - 1 ? "border-b-[0.5px] border-line" : ""
              }`}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">
                {k}
              </span>
              <span className="text-right text-[13px]">{v}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT, delay: 1.7 }}
          className="mt-7 flex flex-col gap-2.5 pb-7"
        >
          <Link
            href="/profile"
            className={buttonClassName({ variant: "solid", size: "lg", block: true })}
          >
            {t("cta_calendar")}
          </Link>
          <Link
            href="/home"
            className={buttonClassName({ variant: "ghost", size: "lg", block: true })}
          >
            {t("cta_return")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
