import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { CurrencyCode } from "@/db/schema";
import { formatMajorAmount } from "@/entities/service/api/format-currency";
import type { Locale } from "@/i18n/routing";

export interface PriceProps extends HTMLAttributes<HTMLSpanElement> {
  resolved: ResolvedPrice;
  /**
   * Active display currency. Defaults to "EUR" so legacy callers that
   * haven't been migrated still render — they get "€95" exactly as
   * before. New callers pass the live `site_settings.currency`.
   */
  currency?: CurrencyCode;
  /**
   * Active locale. Defaults to "en" so legacy callers still render.
   * New callers thread the active request locale through.
   */
  locale?: Locale;
  freeLabel?: string;
}

export function Price({
  resolved,
  currency = "EUR",
  locale = "en",
  freeLabel,
  className,
  ...rest
}: PriceProps) {
  if (resolved.effective === 0 && freeLabel) {
    return (
      <span className={className} {...rest}>
        {freeLabel}
      </span>
    );
  }
  const effective = formatMajorAmount({
    amountCents: resolved.effective * 100,
    currency,
    locale,
  });
  const base = formatMajorAmount({
    amountCents: resolved.base * 100,
    currency,
    locale,
  });
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5", className)}
      {...rest}
    >
      <span>{effective}</span>
      {resolved.hasDiscount ? (
        <s className="font-mono text-[11px] text-text-3">{base}</s>
      ) : null}
    </span>
  );
}
