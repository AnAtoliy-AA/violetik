import { describe, it, expect, beforeEach } from "vitest";
import {
  pushEvent,
  snapshot,
  _resetAnalyticsQueue,
} from "./queue";

describe("analytics queue", () => {
  beforeEach(() => {
    _resetAnalyticsQueue();
  });

  it("counts received events and exposes them through snapshot()", () => {
    pushEvent({
      name: "welcome_landed",
      sessionId: "s-1",
      route: "/welcome",
      ts: 1,
    });
    pushEvent({
      name: "home_next_opening_tapped",
      sessionId: "s-1",
      route: "/home",
      ts: 2,
    });
    const snap = snapshot();
    expect(snap.total).toBe(2);
    expect(snap.dropped).toBe(0);
    expect(snap.recent).toHaveLength(2);
    expect(snap.byName.welcome_landed).toBe(1);
    expect(snap.byName.home_next_opening_tapped).toBe(1);
  });

  it("drops the oldest events when overflow occurs", () => {
    for (let i = 0; i < 5_010; i++) {
      pushEvent({
        name: "welcome_landed",
        sessionId: "s",
        route: "/",
        ts: i,
      });
    }
    const snap = snapshot();
    expect(snap.total).toBe(5_010);
    expect(snap.dropped).toBe(10);
    expect(snap.recent.length).toBeLessThanOrEqual(200);
    // The oldest events (ts 0..9) are gone — earliest retained ts is >= 10.
    const minTsRetained = snap.recent.reduce(
      (acc, e) => Math.min(acc, e.ts),
      Number.POSITIVE_INFINITY,
    );
    expect(minTsRetained).toBeGreaterThanOrEqual(10);
  });
});
