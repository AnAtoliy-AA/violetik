"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CurrencyCode } from "@/db/schema";
import type { Service } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import { Price } from "@/shared/ui/price";
import { useBookingStore } from "@/views/booking/model/booking-store";

export interface ServiceStepProps {
  services: readonly Service[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
}

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

export function ServiceStep({
  services,
  pricedServices,
  currency = "EUR",
}: ServiceStepProps) {
  const t = useTranslations("Booking.service");
  const locale = useLocale() as Locale;
  const serviceId = useBookingStore((s) => s.serviceId);
  const setService = useBookingStore((s) => s.setService);

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-h2 font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <LetterpressRule className="mb-4 mt-3 max-w-[180px]" />
      <p className="m-0 mb-5 text-sm text-text-2">{t("paragraph")}</p>

      <div className="flex flex-col gap-2.5">
        {services.map((s, i) => {
          const active = serviceId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setService(s.id)}
              className={cn(
                "group gilded flex items-start gap-3.5 rounded-[18px] p-3.5 text-left text-text",
                "transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                active ? "glass-top" : "hover:bg-surface-2",
              )}
            >
              <div className="gilded h-[70px] w-14 shrink-0 overflow-hidden rounded-lg">
                <NailTile
                  palette={["#c9a96e", "#7d3a6f"]}
                  variant={(i % 6) as NailTileVariant}
                  className="size-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                {/* §6.4 — duration eyebrow above the name, mono caps. */}
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
                  {t("service_tile_duration", {
                    n: s.durationMinutes,
                  })}
                </div>
                <div className="mt-1 font-display text-[20px] font-normal italic leading-[1.05]">
                  {s.name}
                </div>
                {/* §6.4 — 1-line italic fragment of what's in the service.
                  * Reveals the full list on hover/focus via grid-template-
                  * rows expand (no layout shift below — the row collapses
                  * back to 0fr when the tile loses focus). */}
                {s.includes.length > 0 ? (
                  <>
                    <div className="mt-1.5 line-clamp-1 font-display text-[13.5px] italic leading-snug text-text-2 group-hover:hidden group-focus-visible:hidden">
                      {s.includes[0]}
                    </div>
                    <div
                      aria-hidden
                      className="mt-1.5 grid grid-rows-[0fr] transition-[grid-template-rows] duration-[220ms] ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] motion-reduce:transition-none"
                    >
                      <ul className="m-0 list-none overflow-hidden p-0">
                        {s.includes.map((line, i) => (
                          <li
                            key={`${line}-${i}`}
                            className="flex items-baseline gap-2 py-0.5 font-display text-[13px] italic leading-snug text-text-2"
                          >
                            <span
                              aria-hidden
                              className="font-mono text-[9px] text-gold"
                            >
                              ·
                            </span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : null}
                <div className="mt-2 flex items-baseline gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                  {pricedServices?.[s.id] ? (
                    <Price
                      resolved={pricedServices[s.id]}
                      currency={currency}
                      locale={locale}
                    />
                  ) : (
                    <span>{s.displayPrice}</span>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex size-[22px] shrink-0 items-center justify-center self-center rounded-full",
                  "transition-colors duration-fast ease-out",
                  active
                    ? "bg-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]"
                    : "border-[0.5px] border-line-strong bg-transparent",
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
