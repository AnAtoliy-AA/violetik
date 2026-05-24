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
    expect(state.masterId).toBeNull();
    expect(state.date).toBeNull();
    expect(state.time).toBeNull();
  });

  it("setMaster updates masterId", () => {
    useBookingStore.getState().setMaster("violetta");
    expect(useBookingStore.getState().masterId).toBe("violetta");
  });

  it("setService clears masterId", () => {
    useBookingStore.setState({ serviceId: "signature", masterId: "violetta" });
    useBookingStore.getState().setService("editorial");
    expect(useBookingStore.getState().masterId).toBeNull();
  });

  it("reset clears masterId too", () => {
    useBookingStore.getState().setMaster("violetta");
    useBookingStore.getState().reset();
    expect(useBookingStore.getState().masterId).toBeNull();
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
