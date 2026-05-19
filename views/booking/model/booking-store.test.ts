import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBookingStore } from "./booking-store";

describe("useBookingStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useBookingStore.getState().reset();
  });

  afterEach(() => {
    useBookingStore.getState().reset();
  });

  it("starts with null selections", () => {
    const state = useBookingStore.getState();
    expect(state.serviceId).toBeNull();
    expect(state.date).toBeNull();
    expect(state.time).toBeNull();
  });

  it("setters update individual fields", () => {
    useBookingStore.getState().setService("gel");
    useBookingStore.getState().setDate("2026-05-22");
    useBookingStore.getState().setTime("16:00");
    const state = useBookingStore.getState();
    expect(state.serviceId).toBe("gel");
    expect(state.date).toBe("2026-05-22");
    expect(state.time).toBe("16:00");
  });

  it("reset clears everything", () => {
    useBookingStore.getState().setService("gel");
    useBookingStore.getState().setDate("2026-05-22");
    useBookingStore.getState().setTime("16:00");
    useBookingStore.getState().reset();
    const state = useBookingStore.getState();
    expect(state.serviceId).toBeNull();
    expect(state.date).toBeNull();
    expect(state.time).toBeNull();
  });

  it("persists to sessionStorage under the violetta-booking key", () => {
    useBookingStore.getState().setService("editorial");
    const raw = sessionStorage.getItem("violetta-booking");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "{}").state).toMatchObject({
      serviceId: "editorial",
    });
  });
});
