import { describe, it, expect } from "vitest";
import { buildIcsEvent } from "./build-ics";

describe("buildIcsEvent", () => {
  const start = new Date("2026-06-05T12:30:00Z");

  it("emits a well-formed VCALENDAR/VEVENT block", () => {
    const ics = buildIcsEvent({
      uid: "bk_abc",
      start,
      durationMinutes: 90,
      summary: "Couture Gel · Violetta",
      location: "3rd floor, Zavadskaga 6A",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("UID:bk_abc");
    expect(ics).toContain("DTSTART:20260605T123000Z");
    // 90 minutes later → 14:00 UTC
    expect(ics).toContain("DTEND:20260605T140000Z");
    expect(ics).toContain("SUMMARY:Couture Gel · Violetta");
  });

  it("escapes RFC 5545 reserved characters in TEXT fields", () => {
    const ics = buildIcsEvent({
      uid: "bk_x",
      start,
      durationMinutes: 60,
      summary: "Foo; bar, baz",
      description: "Line one\nLine two",
    });
    expect(ics).toContain("SUMMARY:Foo\\; bar\\, baz");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
  });

  it("ends every line with CRLF per the spec", () => {
    const ics = buildIcsEvent({
      uid: "bk_y",
      start,
      durationMinutes: 60,
      summary: "Short",
    });
    // Should not have stray LF-only line endings between BEGIN/END blocks.
    expect(ics).toMatch(/BEGIN:VEVENT\r\n/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
  });
});
