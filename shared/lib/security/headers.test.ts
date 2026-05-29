import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "./headers";

function header(key: string): string {
  const found = SECURITY_HEADERS.find((h) => h.key === key);
  if (!found) throw new Error(`missing header: ${key}`);
  return found.value;
}

describe("SECURITY_HEADERS", () => {
  it("denies framing to block clickjacking", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
  });

  it("blocks MIME sniffing", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
  });

  it("enforces HSTS for at least one year with subdomains", () => {
    const hsts = header("Strict-Transport-Security");
    expect(hsts).toMatch(/max-age=\d+/);
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)![1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
    expect(hsts).toContain("includeSubDomains");
  });

  it("sets a privacy-preserving referrer policy", () => {
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("restricts powerful browser features", () => {
    const pp = header("Permissions-Policy");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  it("ships a CSP that locks down the dangerous directives", () => {
    const csp = header("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
  });

  it("allows the Telegram login widget origins in the CSP", () => {
    const csp = header("Content-Security-Policy");
    expect(csp).toContain("https://telegram.org");
    expect(csp).toContain("https://oauth.telegram.org");
  });
});
