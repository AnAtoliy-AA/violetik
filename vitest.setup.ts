import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// `server-only` throws at import time in a client/test context — that's
// its whole job. In tests we exercise server modules as plain JS, so
// stub it out globally to a no-op.
vi.mock("server-only", () => ({}));

// Stub the notification dispatcher across the test runner. Every server
// action that imports it now treats it as a no-op (`vi.fn()`); tests
// that care about dispatch arguments can re-`vi.mock` it locally.
vi.mock("@/shared/lib/notifications", () => ({
  dispatchNotification: vi.fn(),
  NOTIFICATION_CATEGORIES: [
    "booking_created",
    "booking_confirmed",
    "booking_cancelled",
    "booking_reminder_24h",
    "vip_decision",
    "vip_request_submitted",
    "testimonial_decision",
    "testimonial_submitted",
  ],
  ADMIN_CATEGORIES: new Set([
    "booking_created",
    "vip_request_submitted",
    "testimonial_submitted",
  ]),
}));

// jsdom doesn't implement matchMedia. Polyfill with a no-op so components
// that consult media queries (useReducedMotion, hover-only effects) can mount.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom also doesn't ship ResizeObserver. Components that measure their own
// size (gallery strip drag bounds, onboarding pager width) construct one on
// mount — the no-op shape is enough for them to render.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

afterEach(() => {
  cleanup();
});
