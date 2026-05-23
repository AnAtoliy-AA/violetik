import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { StudioMap } from "./studio-map";

const DICT = {
  mapAria: "Studio location",
  mapTitle: "Studio location",
  getDirections: "Get directions",
};

describe("StudioMap", () => {
  it("renders nothing when mapVisible is false", () => {
    const { container } = render(
      <StudioMap settings={DEFAULT_SITE_SETTINGS} dictionary={DICT} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when coords are null even with mapVisible true", () => {
    const { container } = render(
      <StudioMap
        settings={{ ...DEFAULT_SITE_SETTINGS, mapVisible: true }}
        dictionary={DICT}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders an OSM iframe and a Google Maps directions link when enabled", () => {
    const { getByTitle, getByRole } = render(
      <StudioMap
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          mapVisible: true,
          latitude: 54.231,
          longitude: 28.491,
        }}
        dictionary={DICT}
      />,
    );
    const iframe = getByTitle(/studio location/i);
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("src")).toContain("openstreetmap.org/export/embed.html");
    expect(iframe.getAttribute("src")).toContain("marker=54.231,28.491");
    expect(iframe).toHaveAttribute("loading", "lazy");

    const link = getByRole("link", { name: /get directions/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=54.231,28.491",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
  });
});
