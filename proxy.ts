import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { getCachedDefaultLocale } from "@/shared/lib/site-settings-cache";

// `createMiddleware` is a factory — calling it per request is the
// recommended pattern for runtime-derived config (next-intl's
// middleware factory in node_modules/next-intl). The TTL cache in
// getCachedDefaultLocale keeps the per-request DB hit bounded; admin
// saves invalidate it directly. Next 16 proxy runs on the Node
// runtime by default (the `runtime` config option is forbidden here).
export default async function proxy(req: NextRequest) {
  const defaultLocale = await getCachedDefaultLocale();
  const handler = createMiddleware({ ...routing, defaultLocale });
  return handler(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
