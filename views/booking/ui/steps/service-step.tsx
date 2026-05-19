"use client";

import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { useBookingStore } from "@/views/booking/model/booking-store";

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 14 14" width={12} height={12}>
      <path
        d="M3 7.2 5.8 10 11 4.2"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="var(--color-bg)"
      />
    </svg>
  );
}

export function ServiceStep() {
  const t = useTranslations("Booking.service");
  const serviceId = useBookingStore((s) => s.serviceId);
  const setService = useBookingStore((s) => s.setService);

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-[36px] font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <p className="m-0 mb-5 text-sm text-text-2">{t("paragraph")}</p>

      <div className="flex flex-col gap-2.5">
        {STUDIO_DATA.services.map((s, i) => {
          const active = serviceId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setService(s.id)}
              className={cn(
                "flex items-center gap-3.5 rounded-[18px] p-3.5 text-left text-text",
                "border-[0.5px] transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                active
                  ? "border-accent bg-surface-2"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <div className="h-[70px] w-14 shrink-0 overflow-hidden rounded-lg">
                <NailTile
                  palette={["#c9a96e", "#7d3a6f"]}
                  variant={(i % 6) as NailTileVariant}
                  className="size-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[20px] font-normal italic leading-[1.05]">
                  {s.name}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                  {s.duration} · €{s.price}
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex size-[22px] shrink-0 items-center justify-center self-center rounded-full",
                  "border-[0.5px] transition-colors duration-fast ease-out",
                  active
                    ? "border-accent bg-accent"
                    : "border-line-strong bg-transparent",
                )}
              >
                {active ? <CheckIcon /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
