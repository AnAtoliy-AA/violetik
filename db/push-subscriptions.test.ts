import { describe, it, expect } from "vitest";
import {
  listSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
} from "./push-subscriptions";

describe("listSubscriptionsByUser", () => {
  it("returns an array for a non-existent user", async () => {
    const rows = await listSubscriptionsByUser("user_does_not_exist_xyz");
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("deleteSubscriptionByEndpoint", () => {
  it("returns false when the endpoint is unknown", async () => {
    const deleted = await deleteSubscriptionByEndpoint(
      "https://example.invalid/endpoint-does-not-exist",
    );
    expect(deleted).toBe(false);
  });
});
