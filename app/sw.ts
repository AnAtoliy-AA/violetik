/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

// Bounded navigation handler — must come before defaultCache so it
// matches first. defaultCache's own NetworkFirst for navigations has no
// timeout, so a slow SSR (DB stall, cold lambda) leaves the user
// staring at a blank chrome until the response eventually comes in or
// the fetch errors. With networkTimeoutSeconds, the SW gives up on the
// network after 4s and serves the cached version (or falls through to
// the offline fallback below) — perceived latency stays bounded.
const navigationHandler = {
  matcher: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
    sameOrigin && request.mode === "navigate",
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
  runtimeCaching: [navigationHandler, ...defaultCache],
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
