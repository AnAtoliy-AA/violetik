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
import { buttonClassName } from "@/shared/ui/button";
import { MagneticButton } from "@/shared/ui/magnetic-button";
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
}

export function BookingPage({
  step,
  services,
  pricedServices,
  currency = "EUR",
  masters,
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

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected && !serviceId) setService(selected);
  }, [searchParams, serviceId, setService]);

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
          setSubmitError(result.error);
        }
      });
      return;
    }
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
            {step === "date" ? <DateStep /> : null}
            {step === "time" ? <TimeStep /> : null}
            {step === "confirm" ? (
              <ConfirmStep
                services={services}
                pricedServices={pricedServices}
                currency={currency}
                masters={masters}
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
    </div>
  );
}
