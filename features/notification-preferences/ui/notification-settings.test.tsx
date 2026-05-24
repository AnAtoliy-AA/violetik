import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, it, expect, vi } from "vitest";
import { NotificationSettings } from "./notification-settings";
import messages from "@/messages/en.json";

vi.mock("../api/actions", () => ({
  toggleCategoryAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./enable-push-button", () => ({
  EnablePushButton: () => null,
}));

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

describe("NotificationSettings", () => {
  it("renders eight categories for an admin user", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin
          initialPreferences={{}}
          vapidPublicKey="X"
        />,
      ),
    );
    expect(screen.getAllByRole("switch")).toHaveLength(8);
  });

  it("hides admin categories for a customer", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin={false}
          initialPreferences={{}}
          vapidPublicKey="X"
        />,
      ),
    );
    expect(screen.getAllByRole("switch")).toHaveLength(5);
  });

  it("defaults every switch to unchecked", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin
          initialPreferences={{}}
          vapidPublicKey="X"
        />,
      ),
    );
    for (const sw of screen.getAllByRole("switch")) {
      expect(sw).toHaveAttribute("aria-checked", "false");
    }
  });

  it("respects initial preferences", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin={false}
          initialPreferences={{ booking_confirmed: true }}
          vapidPublicKey="X"
        />,
      ),
    );
    const switches = screen.getAllByRole("switch");
    const checked = switches.filter(
      (sw) => sw.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(1);
  });
});
