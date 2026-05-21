import { getLocale, getTranslations } from "next-intl/server";
import { WEEKLY_DEFAULT_HOURS } from "@/shared/lib/google-calendar";
import { cn } from "@/shared/lib/cn";
import { resolveAtelierStatus } from "../lib/resolve-status";

export interface AtelierHoursProps {
  className?: string;
}

/** A live "Open · …" line under the home header. Server-rendered. */
export async function AtelierHours({ className }: AtelierHoursProps) {
  const t = await getTranslations("AtelierHours");
  const locale = await getLocale();

  const status = resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, new Date());

  if (status.state === "no-hours") {
    return null;
  }

  let label: string;
  let isOpen: boolean;
  if (status.state === "open") {
    isOpen = true;
    label = t("open_until", { time: status.closesAt });
  } else {
    isOpen = false;
    // Intl.DateTimeFormat needs a real Date — pick any week with that dow.
    // 2026-05-17 is Sunday (dow 0); add the dow offset.
    const sampleSunday = new Date(2026, 4, 17, 12, 0);
    const sampleDay = new Date(sampleSunday);
    sampleDay.setDate(sampleSunday.getDate() + status.opensAt.dayOfWeek);
    const dayName = new Intl.DateTimeFormat(locale, {
      weekday: "long",
    }).format(sampleDay);
    label = t("opens_on", { day: dayName, time: status.opensAt.time });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 px-[22px] pb-2 pt-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-text-2",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 rounded-full motion-safe:animate-soft-pulse",
          isOpen ? "bg-[#7ec699]" : "bg-accent",
        )}
        data-state={isOpen ? "open" : "closed"}
      />
      <span>{label}</span>
    </div>
  );
}
