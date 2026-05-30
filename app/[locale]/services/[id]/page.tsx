import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice } from "@/entities/site-settings";
import {
  loadPublishedServiceIds,
  loadServiceByIdForLocale,
  loadServicesForLocale,
} from "@/entities/service/api/load";
import { loadEligibleMastersForService } from "@/entities/master/api/load";
import { listApprovedTestimonials } from "@/entities/testimonial";
import type { CurrencyCode } from "@/db/schema";
import { routing, type Locale } from "@/i18n/routing";
import { ServiceDetailPage } from "@/views/service-detail";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; id: string };

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

export async function generateStaticParams() {
  const ids = await loadPublishedServiceIds();
  return routing.locales.flatMap((locale) =>
    ids.map((id) => ({ locale, id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return { title: "Violetta" };
  const service = await loadServiceByIdForLocale(id, locale);
  if (!service) return { title: "Violetta" };
  const t = await getTranslations({ locale, namespace: "ServiceDetail" });
  return { title: `Violetta — ${service.name} · ${t("meta_subtitle")}` };
}

export default async function ServiceDetailRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const service = await loadServiceByIdForLocale(id, locale);
  if (!service) notFound();
  const [settings, allServices, eligibleMasters] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale),
    loadEligibleMastersForService(service.id, locale),
  ]);
  const resolvedPrice = resolvePrice(
    `service:${service.id}`,
    service.price,
    settings,
  );
  const currency =
    ((settings as { currency?: CurrencyCode }).currency ?? "EUR");

  // §8.3 — surface the service's eligible master inline. Solo studios end
  // up with exactly one row; the section auto-hides when no master exists.
  const master = eligibleMasters[0] ?? null;

  // §8.1 — "Pairs well with": three sibling services from the same
  // category (excluding the current one), ranked by sortOrder. The
  // brief mentions `service.pairsWith` but the entity has no such field
  // yet; same-category siblings are the closest objective signal we
  // already model.
  const pairs = allServices
    .filter(
      (s) => s.id !== service.id && s.category.id === service.category.id,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);

  // §8.2 + §11.3 — service-specific reviews. Testimonials now carry
  // an optional serviceId; prefer those, fall back to the master's
  // general reviews until per-service ones accumulate. Empty list
  // collapses the section entirely (the brief explicitly forbids
  // filler).
  let reviews = master
    ? await listApprovedTestimonials({
        masterId: master.id,
        serviceId: service.id,
        limit: 6,
      })
    : [];
  if (reviews.length === 0 && master) {
    reviews = await listApprovedTestimonials({
      masterId: master.id,
      limit: 6,
    });
  }

  return (
    <ServiceDetailPage
      service={service}
      resolvedPrice={resolvedPrice}
      currency={currency}
      locale={locale}
      telegramUsername={settings.telegramUsername}
      master={master}
      pairs={pairs}
      reviews={reviews}
    />
  );
}
