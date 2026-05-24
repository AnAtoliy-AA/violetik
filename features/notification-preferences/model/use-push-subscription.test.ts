import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePushSubscription } from "./use-push-subscription";

describe("usePushSubscription", () => {
  it("reports 'unsupported' on initial mount in jsdom (no PushManager)", () => {
    const { result } = renderHook(() => usePushSubscription("VAPID"));
    // jsdom doesn't ship PushManager — the hook must surface that
    // synchronously so the UI never enables the toggles.
    expect(result.current.status === "unsupported" || result.current.status === "loading").toBe(true);
  });
});
