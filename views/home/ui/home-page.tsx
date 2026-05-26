import { Suspense } from "react";
import { AppHeader } from "@/widgets/app-header";
import { AtelierHours } from "@/widgets/atelier-hours";
import { TabBar } from "@/widgets/tab-bar";
import type { Locale } from "@/i18n/routing";
import { Aurora } from "@/shared/ui/aurora";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { TonightStrip } from "@/widgets/tonight-strip";
import { AnnouncementCapsule } from "./sections/announcement-capsule";
import { AtelierMotion } from "./sections/atelier-motion";
import { GalleryStrip } from "./sections/gallery-strip";
import { HomeHero } from "./sections/home-hero";
import { MembershipCard } from "./sections/membership-card";
import { NextOpeningLine } from "./sections/next-opening-line";
import { SignaturesList } from "./sections/signatures-list";
import { TrustStrip } from "./sections/trust-strip";
import { HomeFooterAsync } from "./sections/home-footer-async";
import { MasterStripAsync } from "./sections/master-strip-async";
import { TestimonialCardAsync } from "./sections/testimonial-card-async";
import {
  HomeFooterSkeleton,
  MasterStripSkeleton,
  TestimonialCardSkeleton,
} from "./sections/home-skeletons";

export interface HomePageProps {
  locale: Locale;
  showAdmin?: boolean;
}

export function HomePage({ locale, showAdmin = false }: HomePageProps) {
  return (
    <div className="pb-28">
      <AppHeader />
      <AtelierHours />
      <TonightStrip />
      <section className="relative px-[22px] pb-9 pt-2.5 md:px-12 md:pb-14 md:pt-6">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <HomeHero />
        <NextOpeningLine />
      </section>
      <AnnouncementCapsule />
      <SignaturesList />
      <Suspense fallback={<MasterStripSkeleton />}>
        <MasterStripAsync locale={locale} />
      </Suspense>
      <TrustStrip />
      <GalleryStrip />
      <AtelierMotion />
      <Suspense fallback={<TestimonialCardSkeleton />}>
        <TestimonialCardAsync />
      </Suspense>
      <MembershipCard />
      <Suspense fallback={<HomeFooterSkeleton />}>
        <HomeFooterAsync locale={locale} />
      </Suspense>
      <TabBar showAdmin={showAdmin} />
    </div>
  );
}
