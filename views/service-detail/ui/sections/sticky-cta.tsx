import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedPrice } from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";
import { Price } from "@/shared/ui/price";

export interface StickyCtaProps {
  serviceId: string;
  resolvedPrice: ResolvedPrice;
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

export function StickyCta({ serviceId, resolvedPrice }: StickyCtaProps) {
  const t = useTranslations("ServiceDetail");
  return (
    <div
      className="sticky bottom-0 px-[22px] pb-6 pt-3.5"
      style={{
        background: "linear-gradient(to top, var(--color-bg) 70%, transparent)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div className="shrink-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
            {t("from")}
          </div>
          <div className="font-display text-[28px] font-normal italic leading-none text-gold">
            <Price resolved={resolvedPrice} />
          </div>
        </div>
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
      </div>
    </div>
  );
}
