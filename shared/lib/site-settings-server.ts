import { cache } from "react";
import { getSiteSettings } from "@/db/site-settings";

/**
 * React's `cache()` memoizes within a single server render — so
 * layout/page/etc. don't re-hit the DB when they all need the
 * same site settings during one request.
 */
export const getSiteSettingsServer = cache(getSiteSettings);
