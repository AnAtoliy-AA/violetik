import "server-only";
import { cache } from "react";
import { listUserBookings } from "@/db/bookings";
import { listAllServices } from "@/db/services";
import { listPublishedMasters } from "@/db/masters";
import { getSiteSettings } from "@/db/site-settings";
import { withDevTimeout } from "@/db/dev-timeout";
import { loadProfileWithPhoto } from "@/entities/studio/api/load-with-photos";

// React.cache dedupes calls within a single server render. Without it,
// sibling async sub-components rendered in parallel under separate
// <Suspense> boundaries would each issue their own queries. The
// withDevTimeout wrap inside cache() applies to the shared promise, so
// every awaiter sees the same race outcome instead of each starting a
// fresh timer on top of the same underlying query.
export const getCachedUserBookings = cache((userId: string) =>
  withDevTimeout(() => listUserBookings(userId), "profile.userBookings"),
);
export const getCachedAllServices = cache(() =>
  withDevTimeout(() => listAllServices(), "profile.allServices"),
);
export const getCachedPublishedMasters = cache(() =>
  withDevTimeout(() => listPublishedMasters(), "profile.publishedMasters"),
);
export const getCachedSiteSettings = cache(() =>
  withDevTimeout(() => getSiteSettings(), "profile.siteSettings"),
);
export const getCachedProfileWithPhoto = cache(() =>
  withDevTimeout(() => loadProfileWithPhoto(), "profile.profileWithPhoto"),
);
