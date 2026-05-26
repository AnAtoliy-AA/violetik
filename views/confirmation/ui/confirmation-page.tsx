"use client";

import { Fragment, useMemo } from "react";
import { m, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Service } from "@/entities/service";
import { Aurora } from "@/shared/ui/aurora";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { formatLongDate } from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";
import { ConfettiBurst } from "./confetti-burst";
import { ConfirmationExtras } from "./confirmation-extras";
import { GoldenSeal } from "./golden-seal";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const HEADLINE_START = 1.1;

/** Splits a headline that uses `<br/>` line breaks into per-word motion spans. */
function HeadlineTypeOn({
  text,
  reduceMotion,
}: {
  text: string;
  reduceMotion: boolean;
}) {
  const lines = text.split(/<br\s*\/?\s*>/i);
  let wordIndex = 0;
  return (
    <>
      {lines.map((line, lineIdx) => (
        <Fragment key={lineIdx}>
          {line.split(/\s+/).filter(Boolean).map((word) => {
            const i = wordIndex++;
            return (
              <m.span
                key={`${lineIdx}-${i}`}
                className="inline-block whitespace-pre"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.55,
                  ease: EASE_OUT,
                  delay: reduceMotion ? 0 : HEADLINE_START + i * 0.06,
                }}
              >
                {word}{" "}
              </m.span>
            );
          })}
          {lineIdx < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </>
  );
}

function buildReservationCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const four = Math.abs(hash % 9000) + 1000;
  return `VB-${four}`;
}

export interface ConfirmationPageProps {
  bookingId?: string;
  serviceId?: string;
  date?: string;
  time?: string;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  /**
   * Optional pre-loaded service (from the DB, locale-resolved). When
   * absent — e.g. on the immediate post-booking confirmation render —
   * the page falls back to "—" labels.
   */
  service?: Service | null;
  /**
   * Studio location line (address + optional city), composed by the
   * server route from `SiteSettings` via `studioLocationLine()`.
   */
  location: string;
}

export function ConfirmationPage(props: ConfirmationPageProps) {
  const t = useTranslations("Confirmation");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  const storeServiceId = useBookingStore((s) => s.serviceId);
  const storeDate = useBookingStore((s) => s.date);
  const storeTime = useBookingStore((s) => s.time);

  const serviceId = props.serviceId ?? storeServiceId;
  const date = props.date ?? storeDate;
  const time = props.time ?? storeTime;

  const service = props.service ?? null;
  const dateLabel = date ? formatLongDate(date, locale) : t("missing_date");
  const timeLabel = time ?? t("missing_time");
  const code = useMemo(() => {
    if (props.bookingId) {
      return `VB-${props.bookingId.replace(/^bk_/, "").slice(0, 4).toUpperCase()}`;
    }
    return buildReservationCode(
      `${serviceId ?? "x"}|${date ?? "x"}|${time ?? "x"}`,
    );
  }, [props.bookingId, serviceId, date, time]);

  const rows: readonly [string, string][] = [
    [t("row_date"), dateLabel],
    [t("row_time"), timeLabel],
    [t("row_where"), props.location],
    [t("row_duration"), service?.duration ?? t("missing_date")],
  ];

  const titleRaw = t.raw("title") as string;

  return (
    <div className="relative overflow-hidden px-[22px] pb-9">
      <Aurora intensity="subtle" />
      <PaperGrain />
      {/* Curtain — the seal scales into a black overlay that clears in 1.6s. */}
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-bg"
        initial={reduceMotion ? false : { opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.4,
          ease: EASE_OUT,
          delay: 0.1,
        }}
        style={{ filter: "blur(14px)" }}
      />
      <ConfettiBurst />
      <div className="relative z-10 pt-10 text-center">
        <GoldenSeal />

        <m.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT, delay: 0.9 }}
          className="mt-7"
        >
          <Eyebrow gold>
            {props.status === "pending"
              ? t("pending_eyebrow", { code })
              : props.status === "cancelled"
                ? t("cancelled_eyebrow", { code })
                : t("reserved_eyebrow", { code })}
          </Eyebrow>
          <h1 className="my-3 mb-1.5 font-display text-h1 font-normal italic leading-tight tracking-[-0.02em]">
            <HeadlineTypeOn text={titleRaw} reduceMotion={reduceMotion ?? false} />
          </h1>
          <LetterpressRule className="mx-auto mt-3 max-w-[160px]" />
          <p className="mx-auto mt-3.5 max-w-[320px] text-[14px] text-text-2">
            {t("subtitle")}
          </p>
        </m.div>

        <m.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT, delay: 1.5 }}
          className="gilded glass-top relative mt-8 overflow-hidden rounded-[28px] p-[22px] text-left"
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
            {service?.name ?? t("missing_date")}
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
          <ConfirmationExtras
            calendar={
              props.bookingId
                ? {
                    apple: `webcal://violetta.example.com/api/booking/${props.bookingId}.ics`,
                    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(service?.name ?? "Violetta")}`,
                    ics: `/api/booking/${props.bookingId}.ics`,
                  }
                : null
            }
            referralUrl={
              typeof window !== "undefined"
                ? `${window.location.origin}/welcome?ref=${code}`
                : null
            }
          />
        </m.div>

        <m.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT, delay: 1.7 }}
          className="mt-7 flex flex-col gap-2.5 pb-7"
        >
          <MagneticButton className="block w-full">
            <Link
              href="/profile"
              className={buttonClassName({
                variant: "gold",
                size: "lg",
                block: true,
              })}
            >
              {t("cta_calendar")}
            </Link>
          </MagneticButton>
          <Link
            href="/home"
            className={buttonClassName({ variant: "ghost", size: "lg", block: true })}
          >
            {t("cta_return")}
          </Link>
        </m.div>
      </div>
    </div>
  );
}
