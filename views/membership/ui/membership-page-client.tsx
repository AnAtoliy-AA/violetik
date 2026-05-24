"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_SITE_SETTINGS,
  resolvePrice,
  type ResolvedPrice,
  type SiteSettings,
} from "@/entities/site-settings";
import type { MembershipTier } from "@/entities/studio";
import { Price } from "@/shared/ui/price";
import { BillingToggle, type Billing } from "./billing-toggle";
import { MembershipTierCard } from "./membership-tier-card";

interface TierPricing {
  resolved: ResolvedPrice | null; // null for the free tier
  cadenceLabel: string;
}

function pricing(
  tier: MembershipTier,
  billing: Billing,
  settings: SiteSettings,
  perMonth: string,
  perYear: string,
): TierPricing {
  if (tier.price === 0) return { resolved: null, cadenceLabel: "" };

  // Member is excluded from overrides; only VIP can be overridden.
  // resolvePrice returns the base (catalog or override) and an
  // effective price after the global discount.
  const monthly = resolvePrice("membership:VIP", tier.price, settings);

  if (billing === "annual") {
    return {
      resolved: {
        base: monthly.base * 10,
        effective: monthly.effective * 10,
        hasDiscount: monthly.hasDiscount,
      },
      cadenceLabel: perYear,
    };
  }
  return { resolved: monthly, cadenceLabel: perMonth };
}

export interface MembershipPageClientProps {
  tiers: MembershipTier[];
  settings?: SiteSettings;
  labels: {
    billingAria: string;
    billingMonthly: string;
    billingAnnual: string;
    priceFree: string;
    cadenceMonth: string;
    cadenceYear: string;
    ctaStayFree: string;
    ctaJoinByTier: Record<string, string>;
    mostChosen: string;
  };
  vipCardCta: ReactNode;
}

export function MembershipPageClient({
  tiers,
  settings = DEFAULT_SITE_SETTINGS,
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
          const { resolved, cadenceLabel } = pricing(
            tier,
            billing,
            settings,
            labels.cadenceMonth,
            labels.cadenceYear,
          );
          const isVip = tier.tier === "VIP";
          return (
            <MembershipTierCard
              key={tier.tier}
              tier={tier}
              priceLabel={resolved ? `€${resolved.effective}` : labels.priceFree}
              priceSlot={resolved ? <Price resolved={resolved} /> : undefined}
              cadenceLabel={cadenceLabel}
              ctaLabel={
                tier.price === 0
                  ? labels.ctaStayFree
                  : labels.ctaJoinByTier[tier.tier] ?? ""
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
