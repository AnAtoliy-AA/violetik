import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { LocalBusinessJsonLd } from "./local-business-jsonld";

const BASE_PROPS = {
  name: "Violetta Beauty",
  siteUrl: "https://violetta.example.com",
  locale: "en" as const,
};

function getJson(html: HTMLElement) {
  const script = html.querySelector('script[type="application/ld+json"]');
  if (!script) throw new Error("JSON-LD script not found");
  return JSON.parse(script.textContent ?? "");
}

describe("LocalBusinessJsonLd", () => {
  it("emits a LocalBusiness with the default seeded address", () => {
    const { container } = render(
      <LocalBusinessJsonLd settings={DEFAULT_SITE_SETTINGS} {...BASE_PROPS} />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data["@type"]).toBe("BeautySalon");
    expect(data.address).toBeDefined();
    expect(data.geo).toBeUndefined();
  });

  it("omits address when all address strings are blank", () => {
    const { container } = render(
      <LocalBusinessJsonLd
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          addressEn: "",
          addressRu: "",
          addressBe: "",
        }}
        {...BASE_PROPS}
      />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data.address).toBeUndefined();
  });

  it("includes the address block when address+country are set", () => {
    const { container } = render(
      <LocalBusinessJsonLd
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          addressEn: "12 Rose",
          cityEn: "Borisov",
        }}
        {...BASE_PROPS}
      />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "12 Rose",
      addressLocality: "Borisov",
      addressCountry: "BY",
    });
  });

  it("includes the geo block only when both coords are present", () => {
    const { container } = render(
      <LocalBusinessJsonLd
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          latitude: 54.231,
          longitude: 28.491,
        }}
        {...BASE_PROPS}
      />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 54.231,
      longitude: 28.491,
    });
  });
});
