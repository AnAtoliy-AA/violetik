"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { STUDIO_DATA, type MembershipTier } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { AppHeader } from "@/widgets/app-header";
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

function ctaFor(tier: MembershipTier, t: (k: string, p?: Record<string, string>) => string) {
  if (tier.price === 0) return t("cta_stay_free");
  return t("cta_join", { tier: tier.tier });
}

export function MembershipPage() {
  const t = useTranslations("Membership");
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="pb-10">
      <AppHeader back="/home" title={t("plate_title")} />

      <section className="px-[22px] pb-4">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="my-2.5 mt-2 font-display text-[44px] font-normal leading-tight tracking-[-0.02em]">
          {t.rich("hero_title", { em: (c) => <em>{c}</em> })}
        </h1>
        <p className="m-0 max-w-[320px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      <section className="px-[22px] pb-1 pt-2.5">
        <BillingToggle
          value={billing}
          onChange={setBilling}
          monthlyLabel={t("billing_monthly")}
          annualLabel={t("billing_annual")}
          ariaLabel={t("billing_aria")}
        />
      </section>

      <section className="flex flex-col gap-3.5 px-[22px] pb-6 pt-5">
        {STUDIO_DATA.membership.map((tier) => {
          const { priceLabel, cadenceLabel } = pricing(
            tier,
            billing,
            t("price_free"),
            t("cadence_month"),
            t("cadence_year"),
          );
          return (
            <MembershipTierCard
              key={tier.tier}
              tier={tier}
              priceLabel={priceLabel}
              cadenceLabel={cadenceLabel}
              ctaLabel={ctaFor(tier, t)}
              mostChosenLabel={t("most_chosen")}
            />
          );
        })}
      </section>

      <section className="px-[22px] pb-10 pt-2.5 text-center">
        <p className="mx-auto m-0 max-w-[280px] text-[12px] text-text-3">
          {t("footnote")}
        </p>
      </section>
    </div>
  );
}
