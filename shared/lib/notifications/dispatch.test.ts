import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async () => ({})),
  },
}));

vi.mock("@/db/users", () => ({ getUserById: vi.fn() }));
vi.mock("@/db/notification-preferences", () => ({
  getNotificationPreferences: vi.fn(),
}));
vi.mock("@/db/push-subscriptions", () => ({
  listSubscriptionsByUser: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn(),
  touchSubscription: vi.fn(),
}));
vi.mock("@/db/notification-log", () => ({
  recordNotification: vi.fn(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () =>
      (k: string, p?: Record<string, string>) =>
        p ? `${k}:${JSON.stringify(p)}` : k,
  ),
}));

import webpush from "web-push";
import { dispatchNotification } from "./dispatch";
import { getUserById } from "@/db/users";
import { getNotificationPreferences } from "@/db/notification-preferences";
import {
  listSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
  touchSubscription,
} from "@/db/push-subscriptions";
import { recordNotification } from "@/db/notification-log";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  process.env.VAPID_SUBJECT = "mailto:x@y";
});

const customer = {
  id: "u",
  role: "customer" as const,
  preferredLocale: "en",
};
const admin = { id: "a", role: "admin" as const, preferredLocale: "en" };

describe("dispatchNotification — gating", () => {
  it("logs 'skipped_prefs' when user is missing", async () => {
    vi.mocked(getUserById).mockResolvedValue(null);
    await dispatchNotification("missing", "booking_confirmed", {
      titleKey: "t",
      bodyKey: "b",
      url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "skipped_prefs",
    );
  });

  it("logs 'skipped_prefs' when category is disabled (default-off)", async () => {
    vi.mocked(getUserById).mockResolvedValue(customer as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({});
    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t",
      bodyKey: "b",
      url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "skipped_prefs",
    );
  });

  it("skips admin-only category for a customer", async () => {
    vi.mocked(getUserById).mockResolvedValue(customer as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_created: true,
    });
    await dispatchNotification("u", "booking_created", {
      titleKey: "t",
      bodyKey: "b",
      url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "skipped_prefs",
    );
  });

  it("logs 'no_subscriptions' when enabled but no devices", async () => {
    vi.mocked(getUserById).mockResolvedValue(customer as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_confirmed: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([]);
    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t",
      bodyKey: "b",
      url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "no_subscriptions",
    );
  });
});

describe("dispatchNotification — fan-out", () => {
  const baseSub = {
    id: "1",
    userId: "u",
    p256dh: "p",
    auth: "a",
    userAgent: null,
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };

  it("prunes endpoint on 410 Gone and records all_failed", async () => {
    vi.mocked(getUserById).mockResolvedValue(customer as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_confirmed: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([
      { ...baseSub, endpoint: "https://dead" } as never,
    ]);
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });

    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t",
      bodyKey: "b",
      url: "/x",
    });

    expect(deleteSubscriptionByEndpoint).toHaveBeenCalledWith("https://dead");
    expect(vi.mocked(recordNotification).mock.calls.at(-1)?.[0].status).toBe(
      "all_failed",
    );
  });

  it("records 'sent' when any device succeeds", async () => {
    vi.mocked(getUserById).mockResolvedValue(customer as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_confirmed: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([
      { ...baseSub, endpoint: "https://ok" } as never,
    ]);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t",
      bodyKey: "b",
      url: "/x",
    });

    expect(touchSubscription).toHaveBeenCalledWith("https://ok");
    expect(vi.mocked(recordNotification).mock.calls.at(-1)?.[0].status).toBe(
      "sent",
    );
  });

  it("admin can receive admin-only category", async () => {
    vi.mocked(getUserById).mockResolvedValue(admin as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_created: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([
      { ...baseSub, userId: "a", endpoint: "https://ok2" } as never,
    ]);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

    await dispatchNotification("a", "booking_created", {
      titleKey: "t",
      bodyKey: "b",
      url: "/admin/bookings",
    });

    expect(vi.mocked(recordNotification).mock.calls.at(-1)?.[0].status).toBe(
      "sent",
    );
  });
});
