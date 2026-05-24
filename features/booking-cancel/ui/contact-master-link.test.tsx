import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { ContactMasterLink } from "./contact-master-link";

const messages = {
  Profile: {
    contact_master_cta: "Contact {name} on Telegram",
    contact_studio_cta: "Contact the studio on Telegram",
    contact_offline_cta: "Please contact the studio.",
  },
};

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("ContactMasterLink", () => {
  it("renders a t.me link for the master when masterTelegram is set", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram="violetta"
          studioTelegram="studio"
        />,
      ),
    );
    const link = screen.getByRole("link", { name: /Contact Violetta on Telegram/i });
    expect(link).toHaveAttribute("href", "https://t.me/violetta");
  });

  it("falls back to the studio link when masterTelegram is null", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram={null}
          studioTelegram="studio"
        />,
      ),
    );
    const link = screen.getByRole("link", { name: /Contact the studio on Telegram/i });
    expect(link).toHaveAttribute("href", "https://t.me/studio");
  });

  it("renders static text when both telegram values are null", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram={null}
          studioTelegram={null}
        />,
      ),
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/Please contact the studio\./i)).toBeVisible();
  });

  it("strips a stray leading @ defensively", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram="@violetta"
          studioTelegram={null}
        />,
      ),
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://t.me/violetta");
  });
});
