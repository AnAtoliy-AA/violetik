import { AppHeader } from "@/widgets/app-header";
import { AtelierHours } from "@/widgets/atelier-hours";
import { TabBar } from "@/widgets/tab-bar";
import type { Master } from "@/entities/master";
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
}

export function HomePage({ master }: HomePageProps = {}) {
  return (
    <div className="pb-28">
      <AppHeader />
      <AtelierHours />
      <section className="relative px-[22px] pb-9 pt-2.5">
        <HomeHero />
      </section>
      <AnnouncementCapsule />
      <SignaturesList />
      <MasterStrip master={master} />
      <GalleryStrip />
      <AtelierMotion />
      <TestimonialCard />
      <MembershipCard />
      <HomeFooter />
      <TabBar />
    </div>
  );
}
