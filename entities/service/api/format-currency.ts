import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

export interface FormatMajorAmountInput {
  amountCents: number;
  currency: CurrencyCode;
  locale: Locale;
}

/**
 * Formats an integer-minor-units amount (e.g. 9500 cents → €95) using
 * the runtime's Intl.NumberFormat for the given locale + currency.
 *
 * The menu shows whole units — `maximumFractionDigits: 0`. ICU picks the
 * symbol position per locale × currency (leading "€95" / "$95" in en,
 * trailing "95 Br" / "95 ₽" in be/ru). The spec accepts this divergence
 * by design — see §6 step 5 in
 * docs/superpowers/specs/2026-05-22-admin-services-management-design.md.
 */
export function formatMajorAmount({
  amountCents,
  currency,
  locale,
}: FormatMajorAmountInput): string {
  const major = Math.round(amountCents / 100);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(major);
}
