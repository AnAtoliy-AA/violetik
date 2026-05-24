import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/db/push-subscriptions", () => ({
  saveSubscription: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn(),
}));
vi.mock("@/db/notification-preferences", () => ({
  setNotificationPreference: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  toggleCategoryAction,
} from "./actions";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";

beforeEach(() => vi.clearAllMocks());

describe("toggleCategoryAction", () => {
  it("rejects unauthenticated", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    const r = await toggleCategoryAction("booking_confirmed", true);
    expect(r).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("rejects unknown category", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "u" } as never);
    const r = await toggleCategoryAction("nope" as never, true);
    expect(r).toEqual({ ok: false, reason: "invalid_category" });
  });
});

describe("savePushSubscriptionAction", () => {
  it("rejects unauthenticated", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    const r = await savePushSubscriptionAction({
      endpoint: "https://x",
      p256dh: "p",
      auth: "a",
      userAgent: "ua",
    });
    expect(r).toEqual({ ok: false, reason: "unauthenticated" });
  });
});

describe("removePushSubscriptionAction", () => {
  it("rejects unauthenticated", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    const r = await removePushSubscriptionAction("https://x");
    expect(r).toEqual({ ok: false, reason: "unauthenticated" });
  });
});
