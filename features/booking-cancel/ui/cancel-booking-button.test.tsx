import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CancelBookingButton } from "./cancel-booking-button";

const messages = {
  Profile: {
    cancel_button: "Cancel visit",
    cancel_confirming: "Cancelling…",
    cancel_error: "Could not cancel — try again or contact the master.",
  },
};

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("CancelBookingButton", () => {
  it("renders the cancel label by default", () => {
    render(
      wrap(
        <CancelBookingButton bookingId="bk_1" action={vi.fn() as never} />,
      ),
    );
    expect(screen.getByRole("button", { name: /Cancel visit/i })).toBeVisible();
  });

  it("calls the action and surfaces an error from a non-ok response", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, reason: "too_late" });
    render(wrap(<CancelBookingButton bookingId="bk_1" action={action} />));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(action).toHaveBeenCalledWith("bk_1"));
    await waitFor(() =>
      expect(
        screen.getByText(/Could not cancel/i),
      ).toBeVisible(),
    );
  });

  it("disables itself while pending", async () => {
    let resolve!: (v: { ok: true }) => void;
    const action = vi.fn(
      () => new Promise<{ ok: true }>((r) => (resolve = r)),
    );
    render(wrap(<CancelBookingButton bookingId="bk_1" action={action} />));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("button")).toBeDisabled(),
    );
    resolve({ ok: true });
  });
});
