/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

// Routes whose HTML varies per signed-in user. Caching navigation
// responses for these would let the SW serve another user's profile
// (or a stale empty state from when SSR fell back during the old 5s
// withQueryTimeout era) to a returning visitor. NetworkOnly keeps the
// SW out of the loop entirely for these — slower offline UX (no cached
// fallback) is the right trade for correctness on personalized data.
const PERSONALIZED_PATHNAME = /^\/(?:en|ru|by)\/(?:profile|admin|booking|onboarding|sign-in)(?:\/|$)/;

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
    sameOrigin &&
    request.mode === "navigate" &&
    PERSONALIZED_PATHNAME.test(url.pathname),
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

// One-shot wipe of the "pages" cache so users upgrading from a prior SW
// version don't keep being served the stale personalized HTML it cached
// (the previous SW's NetworkFirst applied to /profile, /admin, etc.).
// Safe to leave indefinitely — `caches.delete` is a no-op when the cache
// is already absent.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("pages"));
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
