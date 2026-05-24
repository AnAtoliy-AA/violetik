import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/db/bookings", () => ({
  listBookingsDueForReminder: vi.fn(async () => []),
}));
vi.mock("@/db/services", () => ({
  getServiceById: vi.fn(async () => null),
}));
vi.mock("@/db/notification-log", () => ({
  hasRecentBookingReminder: vi.fn(async () => false),
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("GET /api/cron/booking-reminders", () => {
  it("returns 401 in production without bearer token", async () => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "shh";
    const { GET } = await import("./route");
    const res = await GET(new Request("http://x"));
    expect(res.status).toBe(401);
  });

  it("returns 200 in development without bearer", async () => {
    process.env.NODE_ENV = "development";
    const { GET } = await import("./route");
    const res = await GET(new Request("http://x"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.examined).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("returns 401 in production with missing CRON_SECRET (fail closed)", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;
    const { GET } = await import("./route");
    const res = await GET(new Request("http://x"));
    expect(res.status).toBe(401);
  });
});
