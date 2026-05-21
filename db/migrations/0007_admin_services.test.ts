import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SQL = readFileSync(
  join(__dirname, "0007_admin_services.sql"),
  "utf8",
);

describe("0007_admin_services.sql", () => {
  it("seeds the four legacy categories", () => {
    for (const id of ["care", "gel", "design", "form"]) {
      expect(SQL).toMatch(new RegExp(`INSERT INTO "service_categories"[\\s\\S]+'${id}'`));
    }
    // ru/be names from messages/{ru,be}.json
    expect(SQL).toContain("'Уход'");
    expect(SQL).toContain("'Догляд'");
    expect(SQL).toContain("'Дизайн'");
    expect(SQL).toContain("'Дызайн'");
  });

  it("seeds the six legacy services with price_cents and duration_minutes", () => {
    const ids = [
      "signature",
      "gel",
      "editorial",
      "extensions",
      "pedi",
      "removal",
    ];
    for (const id of ids) {
      expect(SQL).toMatch(new RegExp(`INSERT INTO "services"[\\s\\S]+'${id}'`));
    }
    // Spot-check a couple of price/duration translations:
    // signature: €95 → 9500; "75 min" → 75
    expect(SQL).toContain("9500");
    expect(SQL).toContain("75");
    // editorial: €195 → 19500; "150 min" → 150
    expect(SQL).toContain("19500");
    expect(SQL).toContain("150");
  });

  it("uses ON CONFLICT DO NOTHING so the migration is idempotent", () => {
    const onConflictCount = (SQL.match(/ON CONFLICT/g) ?? []).length;
    expect(onConflictCount).toBeGreaterThanOrEqual(2);
  });
});
