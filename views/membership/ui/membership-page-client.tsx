"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { MembershipTier } from "@/entities/studio";
import { BillingToggle, type Billing } from "./billing-toggle";
import { MembershipTierCard } from "./membership-tier-card";

function pricing(
  tier: MembershipTier,
  billing: Billing,
  freeLabel: string,
  perMonth: string,
  perYear: string,
): { priceLabel: string; cadenceLabel: string } {
  if (tier.price === 0) return { priceLabel: freeLabel, cadenceLabel: "" };
  if (billing === "annual") {
    return { priceLabel: `€${tier.price * 10}`, cadenceLabel: perYear };
  }
  return { priceLabel: `€${tier.price}`, cadenceLabel: perMonth };
}

export interface MembershipPageClientProps {
  tiers: MembershipTier[];
  labels: {
    billingAria: string;
    billingMonthly: string;
    billingAnnual: string;
    priceFree: string;
    cadenceMonth: string;
    cadenceYear: string;
    ctaStayFree: string;
    ctaJoin: (tierName: string) => string;
    mostChosen: string;
  };
  vipCardCta: ReactNode;
}

export function MembershipPageClient({
  tiers,
  labels,
  vipCardCta,
}: MembershipPageClientProps) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <section className="px-[22px] pb-1 pt-2.5">
        <BillingToggle
          value={billing}
          onChange={setBilling}
          monthlyLabel={labels.billingMonthly}
          annualLabel={labels.billingAnnual}
          ariaLabel={labels.billingAria}
        />
      </section>

      <section className="flex flex-col gap-3.5 px-[22px] pb-6 pt-5">
        {tiers.map((tier) => {
          const { priceLabel, cadenceLabel } = pricing(
            tier,
            billing,
            labels.priceFree,
            labels.cadenceMonth,
            labels.cadenceYear,
          );
          const isVip = tier.tier === "VIP";
          return (
            <MembershipTierCard
              key={tier.tier}
              tier={tier}
              priceLabel={priceLabel}
              cadenceLabel={cadenceLabel}
              ctaLabel={
                tier.price === 0 ? labels.ctaStayFree : labels.ctaJoin(tier.tier)
              }
              mostChosenLabel={labels.mostChosen}
              ctaSlot={isVip ? vipCardCta : undefined}
            />
          );
        })}
      </section>
    </>
  );
}
