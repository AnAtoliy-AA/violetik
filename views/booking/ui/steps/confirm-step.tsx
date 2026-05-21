"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ResolvedPrice } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile } from "@/shared/ui/nail-tile";
import { Price } from "@/shared/ui/price";
import { formatLongDate } from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";

const HERO_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export interface ConfirmStepProps {
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
}

export function ConfirmStep({ pricedServices }: ConfirmStepProps = {}) {
  const t = useTranslations("Booking.confirm");
  const locale = useLocale();

  const serviceId = useBookingStore((s) => s.serviceId);
  const date = useBookingStore((s) => s.date);
  const time = useBookingStore((s) => s.time);

  const service =
    STUDIO_DATA.services.find((s) => s.id === serviceId) ??
    STUDIO_DATA.services[0];
  const dateLabel = date ? formatLongDate(date, locale) : t("missing_date");
  const timeLabel = time ?? t("missing_time");

  const rows: readonly [string, string][] = [
    [t("row_master"), STUDIO_DATA.artist.name],
    [t("row_date"), dateLabel],
    [t("row_time"), timeLabel],
    [t("row_location"), STUDIO_DATA.studio.address],
  ];

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-[36px] font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <LetterpressRule className="mb-4 mt-3 max-w-[180px]" />
      <p className="m-0 mb-5 text-sm text-text-2">{t("paragraph")}</p>

      <div className="gilded glass-top overflow-hidden rounded-[18px]">
        <div className="flex gap-3.5 border-b-[0.5px] border-line p-5">
          <div className="gilded h-20 w-16 shrink-0 overflow-hidden rounded-[10px]">
            <NailTile
              palette={HERO_PALETTE}
              variant={1}
              className="size-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Eyebrow>{t("row_ritual")}</Eyebrow>
            <div className="my-1 font-display text-[22px] font-normal italic">
              {service.name}
            </div>
            <div className="flex items-baseline gap-1 font-mono text-[12px] uppercase tracking-[0.06em] text-text-3">
              <span>{service.duration}</span>
              <span>·</span>
              {pricedServices?.[service.id] ? (
                <Price resolved={pricedServices[service.id]} />
              ) : (
                <span>€{service.price}</span>
              )}
            </div>
          </div>
        </div>

        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-3 px-5 py-4 ${
              i < rows.length - 1 ? "border-b-[0.5px] border-line" : ""
            }`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">
              {label}
            </span>
            <span className="text-right text-[14px] text-text">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[18px] border-[0.5px] border-dashed border-line-strong px-[18px] py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-3">
              {t("total")}
            </div>
            <div className="font-display text-[30px] font-normal italic text-gold-shimmer">
              {pricedServices?.[service.id] ? (
                <Price resolved={pricedServices[service.id]} />
              ) : (
                <>€{service.price}</>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-3">
              {t("charge_label")}
            </div>
            <div className="text-[13px]">{t("charge_value")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
