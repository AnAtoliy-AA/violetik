"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import type { CurrencyCode } from "@/db/schema";
import type { Master } from "@/entities/master";
import type { Service } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import { emitAnalytics } from "@/shared/lib/analytics/emit";
import { buttonClassName } from "@/shared/ui/button";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { Sheet } from "@/shared/ui/sheet";
import { AppHeader } from "@/widgets/app-header";
import { BookingStepper } from "@/widgets/booking-stepper";
import {
  BOOKING_STEPS,
  type BookingStep,
  indexOfStep,
  nextStep,
  prevStep,
} from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";
import { submitBooking } from "@/views/booking/api/submit";
import { ConfirmStep } from "./steps/confirm-step";
import { DateStep } from "./steps/date-step";
import { MasterStep } from "./steps/master-step";
import { ServiceStep } from "./steps/service-step";
import { TimeStep } from "./steps/time-step";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface BookingPageProps {
  step: BookingStep;
  services: readonly Service[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
  masters: readonly Master[];
  location: string;
  timeZone: string;
}

export function BookingPage({
  step,
  services,
  pricedServices,
  currency = "EUR",
  masters,
  location,
  timeZone,
}: BookingPageProps) {
  const t = useTranslations("Booking");
  const tSteps = useTranslations("Booking.steps");
  const tErr = useTranslations("Booking.errors");
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const setService = useBookingStore((s) => s.setService);
  const serviceId = useBookingStore((s) => s.serviceId);
  const masterId = useBookingStore((s) => s.masterId);
  const date = useBookingStore((s) => s.date);
  const time = useBookingStore((s) => s.time);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected && !serviceId) setService(selected);
  }, [searchParams, serviceId, setService]);

  // §16 — booking funnel telemetry. One enter event per step mount;
  // matches `BOOKING_STEPS` from the brief's funnel (`step` is the
  // /booking/<step> segment).
  useEffect(() => {
    emitAnalytics("booking_step_entered", { step });
  }, [step]);

  // §6.6 — exit-intent save sheet. Triggers once per session when the
  // user is mid-flow (date/time/confirm) and presses Back. We push a
  // sentinel history entry on mount so popstate fires before the URL
  // actually moves off the booking page; if they click "Discard" in
  // the sheet, we explicitly navigate them out.
  const GUARDED_STEPS: ReadonlySet<BookingStep> = new Set([
    "date",
    "time",
    "confirm",
  ]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!GUARDED_STEPS.has(step)) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("violetta.booking-save-sheet-seen") === "1";
    } catch {
      /* private browsing — treat as seen, no sheet */
      seen = true;
    }
    if (seen) return;

    // Push the sentinel so the next Back press lands here, not the prior URL.
    window.history.pushState({ __violettaSaveGuard: true }, "");

    const onPop = () => {
      if (sessionStorage.getItem("violetta.booking-save-sheet-seen") === "1") {
        return;
      }
      try {
        sessionStorage.setItem("violetta.booking-save-sheet-seen", "1");
      } catch {
        /* swallow */
      }
      // Re-push the sentinel so a second Back press still lands on us
      // until the user explicitly discards.
      window.history.pushState({ __violettaSaveGuard: true }, "");
      setSaveSheetOpen(true);
      emitAnalytics("booking_save_sheet_shown", { step });
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
    // GUARDED_STEPS is a stable constant; including it would lint-noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const resumeFromSheet = () => {
    setSaveSheetOpen(false);
    emitAnalytics("booking_save_sheet_resumed", { step });
  };

  const discardFromSheet = () => {
    setSaveSheetOpen(false);
    router.push("/services");
  };

  const telegramSelfLink = (() => {
    if (typeof window === "undefined") return null;
    const url = window.location.href;
    return `https://t.me/share/url?url=${encodeURIComponent(url)}`;
  })();

  const stepIndex = indexOfStep(step);
  const back = prevStep(step);
  const next = nextStep(step);

  const labels = BOOKING_STEPS.map((s) => tSteps(s));

  const canAdvance =
    (step === "service" && !!serviceId) ||
    (step === "master" && !!masterId) ||
    (step === "date" && !!date) ||
    (step === "time" && !!time) ||
    (step === "confirm" && !!serviceId && !!date && !!time);

  const handleAdvance = () => {
    if (step === "confirm") {
      if (!serviceId || !date || !time) return;
      setSubmitError(null);
      startTransition(async () => {
        const result = await submitBooking({
          serviceId,
          masterId,
          date,
          time,
          locale,
        });
        // On success the server action redirects; we only reach here
        // when it returned an error.
        if (result && !result.ok) {
          emitAnalytics("booking_submit_error", { error: result.error });
          setSubmitError(result.error);
          return;
        }
        emitAnalytics("booking_submit_success");
      });
      return;
    }
    emitAnalytics("booking_step_completed", { step });
    if (next) router.push(`/booking/${next}`);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        back={back ? `/booking/${back}` : "/services"}
        title={t("step_counter", { current: stepIndex + 1, total: BOOKING_STEPS.length })}
        ariaBackLabel={t("back_aria")}
      />

      <div className="px-[22px] pb-4">
        <BookingStepper
          labels={labels}
          current={stepIndex}
          ariaLabel={t("progress_aria")}
        />
      </div>

      <div className="flex-1 px-[22px] pb-32 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: EASE_OUT }}
          >
            {step === "service" ? (
              <ServiceStep
                services={services}
                pricedServices={pricedServices}
                currency={currency}
              />
            ) : null}
            {step === "master" ? <MasterStep masters={masters} /> : null}
            {step === "date" ? <DateStep timeZone={timeZone} /> : null}
            {step === "time" ? <TimeStep /> : null}
            {step === "confirm" ? (
              <ConfirmStep
                services={services}
                pricedServices={pricedServices}
                currency={currency}
                masters={masters}
                location={location}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="sticky bottom-0 px-[22px] pb-[22px] pt-3"
        style={{
          background:
            "linear-gradient(to top, var(--color-bg) 60%, transparent)",
        }}
      >
        {canAdvance ? (
          <>
            {submitError ? (
              <p
                role="alert"
                className="mb-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-accent"
              >
                {tErr(submitError)}
              </p>
            ) : null}
            <MagneticButton className="block w-full">
              <button
                type="button"
                onClick={handleAdvance}
                disabled={pending}
                className={buttonClassName({
                  variant: "gold",
                  size: "lg",
                  block: true,
                  className: "gap-2",
                })}
              >
                {step === "confirm" ? t("cta_confirm") : t("cta_continue")}
                <ArrowRight />
              </button>
            </MagneticButton>
          </>
        ) : (
          <Link
            href={`/booking/${step}`}
            aria-disabled
            className={buttonClassName({
              variant: "outline",
              size: "lg",
              block: true,
              className: "pointer-events-none gap-2 opacity-50",
            })}
          >
            {step === "service"
              ? t("cta_pick_service")
              : step === "date"
                ? t("cta_pick_date")
                : t("cta_pick_time")}
          </Link>
        )}
      </div>

      <Sheet
        open={saveSheetOpen}
        onOpenChange={(o) => (o ? setSaveSheetOpen(true) : resumeFromSheet())}
        snapPoints={[0.42]}
        title={t("save_sheet.title")}
        description={t("save_sheet.body")}
      >
        <div className="mt-4 flex flex-col gap-2 pb-2">
          <button
            type="button"
            onClick={resumeFromSheet}
            className={buttonClassName({
              variant: "gold",
              size: "lg",
              block: true,
            })}
          >
            {t("save_sheet.cta_continue")}
          </button>
          {telegramSelfLink ? (
            <a
              href={telegramSelfLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={resumeFromSheet}
              className={buttonClassName({
                variant: "ghost",
                size: "lg",
                block: true,
              })}
            >
              {t("save_sheet.cta_telegram")}
            </a>
          ) : null}
          <button
            type="button"
            onClick={discardFromSheet}
            className={buttonClassName({
              variant: "ghost",
              size: "md",
              block: true,
              className: "text-text-3",
            })}
          >
            {t("save_sheet.cta_discard")}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
