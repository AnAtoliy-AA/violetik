import { AppHeader } from "@/widgets/app-header";
import { AtelierHours } from "@/widgets/atelier-hours";
import { TabBar } from "@/widgets/tab-bar";
import type { Master } from "@/entities/master";
import type { SiteSettings } from "@/entities/site-settings";
import type { Locale } from "@/i18n/routing";
import { Aurora } from "@/shared/ui/aurora";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { AnnouncementCapsule } from "./sections/announcement-capsule";
import { AtelierMotion } from "./sections/atelier-motion";
import { GalleryStrip } from "./sections/gallery-strip";
import { HomeFooter } from "./sections/home-footer";
import { HomeHero } from "./sections/home-hero";
import { MasterStrip } from "./sections/master-strip";
import { MembershipCard } from "./sections/membership-card";
import { SignaturesList } from "./sections/signatures-list";
import { TestimonialCard } from "./sections/testimonial-card";

export interface HomePageProps {
  master?: Master;
  settings: SiteSettings;
  locale: Locale;
}

export function HomePage({ master, settings, locale }: HomePageProps) {
  return (
    <div className="pb-28">
      <AppHeader />
      <AtelierHours />
      <section className="relative px-[22px] pb-9 pt-2.5 md:px-12 md:pb-14 md:pt-6">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <HomeHero />
      </section>
      <AnnouncementCapsule />
      <SignaturesList />
      <MasterStrip master={master} />
      <GalleryStrip />
      <AtelierMotion />
      <TestimonialCard testimonial={null} />
      <MembershipCard />
      <HomeFooter settings={settings} locale={locale} />
      <TabBar />
    </div>
  );
}
