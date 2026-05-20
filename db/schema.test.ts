import { describe, it, expect } from "vitest";
import {
  availabilityRules,
  bookings,
  bookingStatus,
  userRole,
  users,
} from "./schema";
import type {
  AvailabilityRule,
  Booking,
  NewBooking,
  NewUser,
  User,
} from "./schema";

describe("db/schema", () => {
  it("declares the three core tables", () => {
    expect(users).toBeDefined();
    expect(bookings).toBeDefined();
    expect(availabilityRules).toBeDefined();
  });

  it("exposes pgEnums for role and booking status", () => {
    expect(userRole.enumValues).toEqual(["customer", "admin"]);
    expect(bookingStatus.enumValues).toEqual([
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ]);
  });

  it("infers Select/Insert types that line up with the columns", () => {
    // Compile-time check — if these don't typecheck the test fails.
    const _u: NewUser = {
      id: "tg:1",
      telegramId: 1,
    };
    const _b: NewBooking = {
      id: "bk_1",
      userId: "tg:1",
      serviceId: "signature",
      scheduledFor: new Date(),
      durationMinutes: 75,
    };
    // Select types should include the defaulted fields too.
    const _selUser: Pick<User, "id" | "role" | "createdAt"> = {
      id: "tg:1",
      role: "customer",
      createdAt: new Date(),
    };
    const _selBooking: Pick<Booking, "id" | "status" | "createdAt"> = {
      id: "bk_1",
      status: "pending",
      createdAt: new Date(),
    };
    const _selRule: Pick<AvailabilityRule, "id" | "dayOfWeek" | "startTime"> = {
      id: "rule_1",
      dayOfWeek: 2,
      startTime: "10:00",
    };
    expect(_u.id).toBe("tg:1");
    expect(_b.serviceId).toBe("signature");
    expect(_selUser.role).toBe("customer");
    expect(_selBooking.status).toBe("pending");
    expect(_selRule.dayOfWeek).toBe(2);
  });
});
