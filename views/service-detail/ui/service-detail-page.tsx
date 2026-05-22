import { useTranslations } from "next-intl";
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import type { Service } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { AppHeader } from "@/widgets/app-header";
import { DetailDescription } from "./sections/detail-description";
import { DetailHero } from "./sections/detail-hero";
import { IncludesList } from "./sections/includes-list";
import { RecentMiniGallery } from "./sections/recent-mini-gallery";
import { StickyCta } from "./sections/sticky-cta";

export interface ServiceDetailPageProps {
  service: Service;
  resolvedPrice: ResolvedPrice;
  currency?: CurrencyCode;
  locale?: Locale;
}

const HERO_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function ServiceDetailPage({
  service,
  resolvedPrice,
  currency = "EUR",
  locale = "en",
}: ServiceDetailPageProps) {
  const t = useTranslations("ServiceDetail");
  const plateNumber = service.sortOrder;
  const variant = (Math.max(0, service.sortOrder - 1) % 6) as NailTileVariant;
  const recent = STUDIO_DATA.gallery.slice(0, 3);

  const plateTitle = `${t("plate_prefix")} · ${String(plateNumber).padStart(2, "0")}`;

  return (
    <div className="pb-24">
      <div className="relative">
        <DetailHero
          service={service}
          plateNumber={plateNumber}
          variant={variant}
          palette={HERO_PALETTE}
          durationLabel={service.duration}
          resolvedPrice={resolvedPrice}
          currency={currency}
          locale={locale}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0">
          <div className="pointer-events-auto">
            <AppHeader back="/services" title={plateTitle} />
          </div>
        </div>
      </div>
      <DetailDescription service={service} />
      <IncludesList items={service.includes} />
      <RecentMiniGallery items={recent} />
      <StickyCta serviceId={service.id} resolvedPrice={resolvedPrice} />
    </div>
  );
}
