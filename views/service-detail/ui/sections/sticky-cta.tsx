import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedPrice } from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";
import { MagneticButton } from "@/shared/ui/magnetic-button";
import { Price } from "@/shared/ui/price";

export interface StickyCtaProps {
  serviceId: string;
  resolvedPrice: ResolvedPrice;
  /** Service name used to pre-fill the "Ask first" Telegram message. */
  serviceName?: string;
  /** Telegram handle (without @) used as the deep-link target. */
  telegramUsername?: string | null;
}

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function StickyCta({
  serviceId,
  resolvedPrice,
  serviceName,
  telegramUsername,
}: StickyCtaProps) {
  const t = useTranslations("ServiceDetail");

  // §8.5 — Telegram deep-link with a pre-filled "ask first" message.
  // We use the t.me web URL so it works without the app installed;
  // mobile platforms automatically hand it off to the Telegram app.
  const askHref = telegramUsername
    ? `https://t.me/${telegramUsername}?text=${encodeURIComponent(
        t("ask_first_template", { service: serviceName ?? "—" }),
      )}`
    : null;

  return (
    <div
      // pb clears the fixed SiteFooter credit strip (~39px) so the CTA row
      // doesn't sit on top of "CREATED WITH LOVE BY…"; +safe-area for notches.
      className="glass-top sticky bottom-0 px-[22px] pb-[calc(48px+env(safe-area-inset-bottom))] pt-3.5"
      style={{
        background:
          "linear-gradient(to top, var(--color-bg) 72%, transparent)",
        backdropFilter: "var(--backdrop-blur-lg)",
        WebkitBackdropFilter: "var(--backdrop-blur-lg)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div className="shrink-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
            {t("from")}
          </div>
          <div className="font-display text-[28px] font-normal italic leading-none text-gold-shimmer">
            <Price resolved={resolvedPrice} />
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <MagneticButton className="block flex-1">
            <Link
              href={`/booking/service?selected=${encodeURIComponent(serviceId)}`}
              className={buttonClassName({
                variant: "gold",
                size: "lg",
                block: true,
                className: "gap-2",
              })}
            >
              {t("cta_reserve")} <ArrowRight />
            </Link>
          </MagneticButton>
          {askHref ? (
            <a
              href={askHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName({
                variant: "ghost",
                size: "lg",
              })}
            >
              {t("cta_ask_first")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
