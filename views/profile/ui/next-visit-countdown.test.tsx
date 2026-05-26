import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { NextVisitCountdown } from "./next-visit-countdown";

function renderWithIntl(scheduledForIso: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <NextVisitCountdown scheduledForIso={scheduledForIso} />
    </NextIntlClientProvider>,
  );
}

describe("NextVisitCountdown", () => {
  it("renders nothing when the target is already in the past", () => {
    const { container } = renderWithIntl(
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    );
    expect(container.textContent).toBe("");
  });

  it("renders the In N days label for visits more than a day away", () => {
    const target = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    renderWithIntl(target.toISOString());
    expect(screen.getByText(/In/i)).toBeInTheDocument();
    expect(screen.getByText(/days/i)).toBeInTheDocument();
  });

  it("renders Tomorrow for visits in the next day bucket", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    renderWithIntl(tomorrow.toISOString());
    expect(screen.getByText(/^Tomorrow$/i)).toBeInTheDocument();
  });
});
