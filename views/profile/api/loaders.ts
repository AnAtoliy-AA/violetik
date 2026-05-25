import "server-only";
import { cache } from "react";
import { listUserBookings } from "@/db/bookings";
import { listAllServices } from "@/db/services";
import { listPublishedMasters } from "@/db/masters";
import { getSiteSettings } from "@/db/site-settings";
import { loadProfileWithPhoto } from "@/entities/studio/api/load-with-photos";

// React.cache dedupes calls within a single server render. Without it,
// sibling async sub-components rendered in parallel under separate
// <Suspense> boundaries would each issue their own queries.
export const getCachedUserBookings = cache((userId: string) =>
  listUserBookings(userId),
);
export const getCachedAllServices = cache(() => listAllServices());
export const getCachedPublishedMasters = cache(() => listPublishedMasters());
export const getCachedSiteSettings = cache(() => getSiteSettings());
export const getCachedProfileWithPhoto = cache(() => loadProfileWithPhoto());
