import { useTranslations } from "next-intl";
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import type { Master } from "@/entities/master";
import type { Service } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import type { ApprovedTestimonial } from "@/entities/testimonial";
import { MountEvent } from "@/shared/lib/analytics/mount-event";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { AppHeader } from "@/widgets/app-header";
import { AftercareSection } from "./sections/aftercare-section";
import { DetailDescription } from "./sections/detail-description";
import { DetailHero } from "./sections/detail-hero";
import { IncludesList } from "./sections/includes-list";
import { MasterAttribution } from "./sections/master-attribution";
import { PairsWellWith } from "./sections/pairs-well-with";
import { RecentMiniGallery } from "./sections/recent-mini-gallery";
import { ServiceReviews } from "./sections/service-reviews";
import { StickyCta } from "./sections/sticky-cta";

export interface ServiceDetailPageProps {
  service: Service;
  resolvedPrice: ResolvedPrice;
  currency?: CurrencyCode;
  locale?: Locale;
  /** Studio Telegram handle (no @) used by the sticky CTA "Ask first" button. */
  telegramUsername?: string | null;
  /** Master to attribute this service to. Section is omitted when null. */
  master?: Master | null;
  /** Sibling services to surface as "Pairs well with". */
  pairs?: readonly Service[];
  /** Approved testimonials for the attributed master. Empty hides section. */
  reviews?: readonly ApprovedTestimonial[];
}

const HERO_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function ServiceDetailPage({
  service,
  resolvedPrice,
  currency = "EUR",
  locale = "en",
  telegramUsername = null,
  master = null,
  pairs = [],
  reviews = [],
}: ServiceDetailPageProps) {
  const t = useTranslations("ServiceDetail");
  const plateNumber = service.sortOrder;
  const variant = (Math.max(0, service.sortOrder - 1) % 6) as NailTileVariant;
  const recent = STUDIO_DATA.gallery.slice(0, 3);

  const plateTitle = `${t("plate_prefix")} · ${String(plateNumber).padStart(2, "0")}`;

  return (
    <div className="pb-24">
      <MountEvent
        event="service_detail_opened"
        payload={{ serviceId: service.id }}
      />
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
      {master ? (
        <MasterAttribution master={master} serviceId={service.id} />
      ) : null}
      <PairsWellWith pairs={pairs} />
      <ServiceReviews reviews={reviews} />
      <AftercareSection />
      <RecentMiniGallery items={recent} />
      <StickyCta
        serviceId={service.id}
        resolvedPrice={resolvedPrice}
        serviceName={service.name}
        telegramUsername={telegramUsername}
      />
    </div>
  );
}
