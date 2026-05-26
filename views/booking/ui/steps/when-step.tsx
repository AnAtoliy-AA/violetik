"use client";

import { useTranslations } from "next-intl";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { DateStep } from "./date-step";
import { TimeStep } from "./time-step";

export interface WhenStepProps {
  timeZone: string;
}

/**
 * §6.2 — combined day-strip + time-grid on a single step. The previous
 * /booking/date and /booking/time screens still resolve and render
 * their respective halves; this step renders both stacked so the user
 * picks a day and then a slot without an extra page transition.
 *
 * Top half: the existing DateStep (day strip + month label + hours
 * summary). Bottom half: TimeStep (slot grid + reserved markers +
 * skeleton while loading).
 */
export function WhenStep({ timeZone }: WhenStepProps) {
  const t = useTranslations("Booking.when");
  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-h2 font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <LetterpressRule className="mb-4 mt-3 max-w-[180px]" />
      <p className="m-0 mb-5 text-sm text-text-2">{t("paragraph")}</p>

      <DateStep timeZone={timeZone} />

      <div className="mt-8">
        <TimeStep />
      </div>
    </div>
  );
}
