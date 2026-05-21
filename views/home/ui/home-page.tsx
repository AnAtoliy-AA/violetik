import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { AnnouncementCapsule } from "./sections/announcement-capsule";
import { AtelierMotion } from "./sections/atelier-motion";
import { GalleryStrip } from "./sections/gallery-strip";
import { HomeFooter } from "./sections/home-footer";
import { HomeHero } from "./sections/home-hero";
import { MasterStrip } from "./sections/master-strip";
import { MembershipCard } from "./sections/membership-card";
import { SignaturesList } from "./sections/signatures-list";
import { TestimonialCard } from "./sections/testimonial-card";

export function HomePage() {
  return (
    <div className="pb-28">
      <AppHeader />
      <section className="relative px-[22px] pb-9 pt-2.5">
        <HomeHero />
      </section>
      <AnnouncementCapsule />
      <SignaturesList />
      <MasterStrip />
      <GalleryStrip />
      <AtelierMotion />
      <TestimonialCard />
      <MembershipCard />
      <HomeFooter />
      <TabBar />
    </div>
  );
}
