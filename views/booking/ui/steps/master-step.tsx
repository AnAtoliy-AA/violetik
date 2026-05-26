"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Master } from "@/entities/master";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { useBookingStore } from "@/views/booking/model/booking-store";

export interface MasterStepProps {
  masters: readonly Master[];
}

export function MasterStep({ masters }: MasterStepProps) {
  const t = useTranslations("Booking.master");
  const serviceId = useBookingStore((s) => s.serviceId);
  const selectedMasterId = useBookingStore((s) => s.masterId);
  const setMaster = useBookingStore((s) => s.setMaster);
  const router = useRouter();

  const eligible = serviceId
    ? masters.filter((m) => m.serviceIds.includes(serviceId))
    : masters;

  useEffect(() => {
    if (eligible.length === 1 && selectedMasterId !== eligible[0].id) {
      setMaster(eligible[0].id);
      router.replace("/booking/when");
    }
  }, [eligible, selectedMasterId, setMaster, router]);

  if (eligible.length === 0) {
    return (
      <div>
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <p className="mt-4 text-[14px] text-text-2">{t("no_eligible")}</p>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-h2 font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <p className="mb-5 text-[14px] text-text-2">{t("subtitle")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {eligible.map((m) => {
          const selected = m.id === selectedMasterId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaster(m.id)}
              aria-pressed={selected}
              className={cn(
                "gilded rounded-[20px] p-4 text-left transition-colors duration-fast ease-out",
                selected ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <div className="font-display text-[20px] italic">{m.name}</div>
              <div className="mt-1 text-[12px] text-text-2">{m.role}</div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {t("years_label", { years: m.years })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
