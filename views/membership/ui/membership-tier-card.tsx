import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import type { MembershipTier } from "@/entities/studio";

export interface MembershipTierCardProps {
  tier: MembershipTier;
  priceLabel: string;
  cadenceLabel: string;
  ctaLabel: string;
  mostChosenLabel: string;
  ctaSlot?: ReactNode;
  /**
   * When present, replaces the `priceLabel` text. Used by paid tiers
   * to render a `<Price>` element (which can include a struck base
   * price when a global discount is active).
   */
  priceSlot?: ReactNode;
}

function Bullet({ featured }: { featured: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={10} height={10}>
      <circle
        cx={6}
        cy={6}
        r={3}
        fill={featured ? "var(--color-accent)" : "var(--color-text-2)"}
      />
    </svg>
  );
}

export function MembershipTierCard({
  tier,
  priceLabel,
  cadenceLabel,
  ctaLabel,
  mostChosenLabel,
  ctaSlot,
  priceSlot,
}: MembershipTierCardProps) {
  const featured = tier.featured;
  return (
    <SpotlightCard
      as="article"
      className={cn(
        "glass-top relative overflow-hidden rounded-[28px] p-[22px]",
        featured ? "gilded-lift" : "gilded",
      )}
    >
      {featured ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-[50px] -top-[50px] size-[180px] rounded-full motion-safe:[animation:sealRotate_60s_linear_infinite]"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 30%, transparent), transparent 70%)",
            }}
          />
          <span className="absolute right-[18px] top-[18px] inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            <MonogramSeal letter="V" className="size-3.5 text-[8px]" />
            {mostChosenLabel}
          </span>
        </>
      ) : null}

      <Eyebrow gold={featured}>{tier.tier}</Eyebrow>
      <h3 className="my-2 mt-2 font-display text-[36px] font-normal italic">
        {priceSlot ?? priceLabel}
        {cadenceLabel ? (
          <span className="ml-2 font-mono text-[12px] not-italic uppercase tracking-[0.12em] text-text-3">
            {cadenceLabel}
          </span>
        ) : null}
      </h3>
      <LetterpressRule className="my-3.5" />

      <div className="my-[18px]">
        {tier.perks.map((p) => (
          <div
            key={p}
            className="flex items-start gap-3 border-t-[0.5px] border-line py-2"
          >
            <span className="mt-1.5">
              <Bullet featured={featured} />
            </span>
            <span className="text-[13px] text-text-2">{p}</span>
          </div>
        ))}
      </div>

      {ctaSlot ??
        (featured ? (
          <MagneticButton className="block w-full">
            <Link
              href="/booking/service"
              className={buttonClassName({
                variant: "gold",
                size: "md",
                block: true,
              })}
            >
              {ctaLabel}
            </Link>
          </MagneticButton>
        ) : (
          <Link
            href="/booking/service"
            className={buttonClassName({
              variant: "outline",
              size: "md",
              block: true,
            })}
          >
            {ctaLabel}
          </Link>
        ))}
    </SpotlightCard>
  );
}
