import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import messages from "@/messages/en.json";
import { ToastProvider } from "@/shared/ui/toast";
import { HomeFooter } from "./home-footer";

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ToastProvider>{ui}</ToastProvider>
    </NextIntlClientProvider>
  );
}

describe("HomeFooter", () => {
  it("renders the per-locale address from settings", () => {
    const { getByText } = render(
      wrap(<HomeFooter settings={DEFAULT_SITE_SETTINGS} locale="en" />),
    );
    expect(
      getByText("By appointment · Verbena Lane 14, Studio B"),
    ).toBeInTheDocument();
  });

  it("appends city to the address line when city is set", () => {
    const { getByText } = render(
      wrap(
        <HomeFooter
          settings={{ ...DEFAULT_SITE_SETTINGS, cityEn: "Borisov" }}
          locale="en"
        />,
      ),
    );
    expect(
      getByText(/By appointment · Verbena Lane 14, Studio B · Borisov/),
    ).toBeInTheDocument();
  });

  it("does not render the map when mapVisible is false", () => {
    const { queryByRole } = render(
      wrap(<HomeFooter settings={DEFAULT_SITE_SETTINGS} locale="en" />),
    );
    expect(queryByRole("link", { name: /get directions/i })).toBeNull();
  });

  it("renders the map when mapVisible is true and coords are set", () => {
    const { getByRole } = render(
      wrap(
        <HomeFooter
          settings={{
            ...DEFAULT_SITE_SETTINGS,
            mapVisible: true,
            latitude: 54.231,
            longitude: 28.491,
          }}
          locale="en"
        />,
      ),
    );
    expect(getByRole("link", { name: /get directions/i })).toBeInTheDocument();
  });
});
