import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import {
  NailTile,
  type NailTileVariant,
} from "@/shared/ui/nail-tile";
import { Price } from "@/shared/ui/price";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { Service } from "../model/types";

export interface ServiceCardProps extends HTMLAttributes<HTMLDivElement> {
  service: Service;
  variant?: NailTileVariant;
  topRule?: boolean;
  palette?: readonly [string, string];
  resolvedPrice?: ResolvedPrice;
  /** Display currency. Defaults to EUR for legacy stories/tests. */
  currency?: CurrencyCode;
  /** Active locale. Defaults to en for legacy stories/tests. */
  locale?: Locale;
}

const DEFAULT_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function ServiceCard({
  service,
  variant = 0,
  topRule = false,
  palette = DEFAULT_PALETTE,
  resolvedPrice,
  currency = "EUR",
  locale = "en",
  className,
  ...rest
}: ServiceCardProps) {
  return (
    <article
      className={cn(
        "group/service flex items-center gap-4 border-line py-[18px]",
        "border-b-[0.5px]",
        topRule && "border-t-[0.5px] border-t-line-strong",
        className,
      )}
      {...rest}
    >
      <div
        className="size-[68px] h-[84px] w-[68px] shrink-0 overflow-hidden rounded-lg"
        style={{ viewTransitionName: `service-hero-${service.id}` }}
      >
        <NailTile
          palette={palette}
          variant={variant}
          image={service.image}
          imageSizes="68px"
          className="size-full"
        />
      </div>
      {/* No hover-translate here: the previous `hover:translate-x-1` on
        * the article clipped the price pill against the parent
        * SpotlightCard's overflow:hidden mask (last digit + last char of
        * the duration label both got chopped). The spotlight glow + the
        * gilded price chip border carry the hover affordance instead. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="shrink-0 font-display text-[22px] italic leading-tight">
            {service.name}
          </h3>
          <span
            aria-hidden
            className="mb-1 h-0 flex-1 border-b-[0.5px] border-dotted border-line-strong"
          />
          {/* Gold-hairline ring chip. \`text-accent\` is the *flat* gold
            * color — \`text-gold\` would set background:linear-gradient +
            * background-clip:text + color:transparent, which renders as
            * invisible text inside a transparent-bg chip because the
            * gradient layer can't paint through. Right margin so the
            * SpotlightCard's overflow:hidden never crops the ring. */}
          <span className="mr-1 inline-flex shrink-0 items-center rounded-full border-[0.5px] border-accent/70 px-2.5 py-0.5 font-mono text-[13px] text-accent">
            {resolvedPrice ? (
              <Price
                resolved={resolvedPrice}
                currency={currency}
                locale={locale}
              />
            ) : (
              service.displayPrice
            )}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="max-w-[75%] text-xs leading-snug text-text-2">
            {service.blurb}
          </p>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
            {service.duration}
          </span>
        </div>
      </div>
    </article>
  );
}
