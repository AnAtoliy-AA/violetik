/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

// Routes whose response varies per signed-in user. Without this guard,
// `defaultCache` from @serwist/turbopack caches *both* full-document
// navigations under "pages" AND App Router RSC fetches under
// "pages-rsc" / "pages-rsc-prefetch" — all via NetworkFirst with no
// network timeout. The cache key is just the URL, so the SW will
// happily replay another session's RSC payload (or an empty profile
// baked when the old 5s withQueryTimeout fired) to a returning
// visitor. We have to intercept BOTH request shapes before defaultCache
// sees them.
const PERSONALIZED_PATHNAME = /^\/(?:en|ru|by)\/(?:profile|admin|booking|onboarding|sign-in)(?:\/|$)/;

const isPersonalizedSameOrigin = (
  sameOrigin: boolean,
  url: URL,
): boolean => sameOrigin && PERSONALIZED_PATHNAME.test(url.pathname);

// Full-document navigation to /profile, /admin, etc.
const personalizedNavigationHandler = {
  matcher: ({
    request,
    sameOrigin,
    url,
  }: {
    request: Request;
    sameOrigin: boolean;
    url: URL;
  }) =>
    request.mode === "navigate" && isPersonalizedSameOrigin(sameOrigin, url),
  handler: new NetworkOnly(),
};

// App Router RSC fetches for the same paths. These are issued during
// client-side navigation (Next-Router-Prefetch === "1" for prefetch on
// hover, RSC === "1" for the actual navigation). defaultCache's RSC
// matchers are NetworkFirst against "pages-rsc[-prefetch]" with no
// timeout — so without this earlier match a stale RSC stream gets
// replayed on every SPA hop back to the personalized route.
const personalizedRscHandler = {
  matcher: ({
    request,
    sameOrigin,
    url,
  }: {
    request: Request;
    sameOrigin: boolean;
    url: URL;
  }) =>
    request.headers.get("RSC") === "1" &&
    isPersonalizedSameOrigin(sameOrigin, url),
  handler: new NetworkOnly(),
};

// Bounded navigation handler for *public* pages (home, master, gallery,
// services, etc.) — defaultCache's own NetworkFirst for navigations has
// no timeout, so a slow SSR (DB stall, cold lambda) leaves the user
// staring at a blank chrome until the response eventually comes in or
// the fetch errors. With networkTimeoutSeconds, the SW gives up on the
// network after 4s and serves the cached version (or falls through to
// the offline fallback below) — perceived latency stays bounded.
const publicNavigationHandler = {
  matcher: ({
    request,
    sameOrigin,
  }: {
    request: Request;
    sameOrigin: boolean;
  }) => sameOrigin && request.mode === "navigate",
  handler: new NetworkFirst({
    cacheName: "pages",
    networkTimeoutSeconds: 4,
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    personalizedNavigationHandler,
    personalizedRscHandler,
    publicNavigationHandler,
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/en/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// One-shot wipe of every cache defaultCache could have populated with
// personalized responses under a prior SW version: full-document HTML
// ("pages") and both App Router RSC streams ("pages-rsc",
// "pages-rsc-prefetch"). Otherwise upgrading users would keep being
// served the stale rows already on disk until their natural eviction
// (32 entries / 24h). Safe to leave indefinitely — `caches.delete` is
// a no-op when the cache is already absent.
const LEGACY_PERSONALIZED_CACHES = [
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(LEGACY_PERSONALIZED_CACHES.map((name) => caches.delete(name))),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data: { title: string; body: string; url: string; tag?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: "Violetta", body: event.data.text(), url: "/" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
      tag: data.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data as { url?: string } | null)?.url ?? "/";
  event.waitUntil(self.clients.openWindow(target));
});
