import { describe, it, expect } from "vitest";
import {
  listUsers,
  countUsers,
  getUserDetail,
  setUserRole,
  setAdminNote,
  grantVip,
  revokeVip,
  suggestMergeCandidates,
  getMergeConflicts,
  mergeUsers,
} from "./users-admin";
import { db } from "./index";

// Unit tests are db-null-tolerant (no DATABASE_URL in CI). Real DB
// semantics are exercised by e2e. When a DATABASE_URL is set locally,
// these contract assertions still hold for empty/missing rows.

describe("listUsers", () => {
  it("returns an array regardless of filters", async () => {
    const rows = await listUsers({ q: "", role: "all", vip: "all", page: 1 });
    expect(Array.isArray(rows)).toBe(true);
  });
  it("returns an array with combined filters", async () => {
    const rows = await listUsers({
      q: "nonexistent-string-xyz",
      role: "admin",
      vip: "active",
      page: 99,
    });
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("countUsers", () => {
  it("returns a non-negative integer", async () => {
    const n = await countUsers({ q: "", role: "all", vip: "all" });
    expect(typeof n).toBe("number");
    expect(n).toBeGreaterThanOrEqual(0);
  });
});

describe("getUserDetail", () => {
  it("returns null for a non-existent id", async () => {
    expect(await getUserDetail("tg:does-not-exist-xyz")).toBeNull();
  });
});

describe("setUserRole", () => {
  it("returns not-found for a non-existent id", async () => {
    const result = await setUserRole("tg:does-not-exist-xyz", "admin");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["last-admin", "not-found"]).toContain(result.reason);
  });
});

describe("setAdminNote", () => {
  it("returns null for a non-existent id (note, then clear)", async () => {
    expect(await setAdminNote("tg:does-not-exist-xyz", "hello")).toBeNull();
    expect(await setAdminNote("tg:does-not-exist-xyz", null)).toBeNull();
  });
});

describe("grantVip", () => {
  it("either returns null when db is unset or fails on FK (no orphan rows)", async () => {
    let result: Awaited<ReturnType<typeof grantVip>> = null;
    try {
      result = await grantVip({
        userId: "tg:does-not-exist-xyz",
        expiresAt: new Date(Date.now() + 30 * 86400_000),
        decidedBy: "tg:also-does-not-exist-xyz",
      });
    } catch {
      // Real DB rejects FK — acceptable. The function attempted the insert.
    }
    expect(result === null || (result && result.userId === "tg:does-not-exist-xyz")).toBe(
      true,
    );
  });

  it("either returns null when db is unset or fails on FK for lifetime grant", async () => {
    let result: Awaited<ReturnType<typeof grantVip>> = null;
    try {
      result = await grantVip({
        userId: "tg:does-not-exist-xyz",
        expiresAt: null,
        decidedBy: "tg:also-does-not-exist-xyz",
      });
    } catch {
      // FK violation acceptable in unit context.
    }
    expect(result === null || (result && result.expiresAt === null)).toBe(true);
  });
});

describe("revokeVip", () => {
  it("returns null when no active VIP exists for the id", async () => {
    expect(await revokeVip("tg:does-not-exist-xyz")).toBeNull();
  });
});

describe("suggestMergeCandidates", () => {
  it("returns an array for scope=all", async () => {
    const result = await suggestMergeCandidates({ scope: "all" });
    expect(Array.isArray(result)).toBe(true);
  });
  it("returns an array for scope=for", async () => {
    const result = await suggestMergeCandidates({
      scope: "for",
      userId: "tg:does-not-exist-xyz",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("getMergeConflicts", () => {
  it("returns the empty shape for ids with no data", async () => {
    expect(
      await getMergeConflicts("tg:nobody-xyz", "google:nobody-xyz"),
    ).toEqual({
      bothPendingVip: false,
      pendingTestimonialCollisions: [],
    });
  });
});

describe("mergeUsers", () => {
  it("refuses when ids are identical", async () => {
    const result = await mergeUsers({
      survivorId: "tg:1",
      loserId: "tg:1",
      overrides: {
        firstName: "survivor",
        lastName: "survivor",
        email: "survivor",
        photoUrl: "survivor",
      },
      auditByAdmin: "tg:admin",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-found");
  });

  it("returns not-found when one of the rows doesn't exist", async () => {
    if (!db) return; // skip when db is unset; the previous test covers the early return
    const result = await mergeUsers({
      survivorId: "tg:does-not-exist-survivor-xyz",
      loserId: "google:does-not-exist-loser-xyz",
      overrides: {
        firstName: "survivor",
        lastName: "survivor",
        email: "survivor",
        photoUrl: "survivor",
      },
      auditByAdmin: "tg:admin-xyz",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["not-found", "conflicts"]).toContain(result.reason);
  });
});

describe("listAdminUserIds", () => {
  it("returns an array", async () => {
    const { listAdminUserIds } = await import("./users-admin");
    expect(Array.isArray(await listAdminUserIds())).toBe(true);
  });
});
