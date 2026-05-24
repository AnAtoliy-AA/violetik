import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestimonialForm } from "./testimonial-form";

const messages = {
  Profile: {
    testimonial_form_master: "Master",
    testimonial_form_body: "Your testimonial",
    testimonial_form_submit: "Submit",
    testimonial_form_submitting: "Submitting…",
    testimonial_form_success: "Thank you — your testimonial is pending review.",
    testimonial_form_too_long: "Please keep it under 800 characters.",
    testimonial_form_required: "Please write a few words.",
    testimonial_form_duplicate:
      "You already have a testimonial pending for this master.",
    testimonial_form_invalid_master: "Please pick a master.",
  },
};

const masters = [
  { id: "m1", name: "Violetta" },
  { id: "m2", name: "Sasha" },
];

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("TestimonialForm", () => {
  it("calls the action with the picked master and trimmed body, then shows success", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, id: "tst_1" });
    render(wrap(<TestimonialForm masters={masters} action={action} />));
    fireEvent.change(screen.getByLabelText(/Master/i), { target: { value: "m2" } });
    fireEvent.change(screen.getByLabelText(/Your testimonial/i), {
      target: { value: "  great service!  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() =>
      expect(action).toHaveBeenCalledWith({
        masterId: "m2",
        body: "great service!",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Thank you/i)).toBeVisible(),
    );
  });

  it("surfaces a duplicate_pending error", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, reason: "duplicate_pending" });
    render(wrap(<TestimonialForm masters={masters} action={action} />));
    fireEvent.change(screen.getByLabelText(/Master/i), { target: { value: "m1" } });
    fireEvent.change(screen.getByLabelText(/Your testimonial/i), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/You already have a testimonial pending/i),
      ).toBeVisible(),
    );
  });

  it("client-blocks an empty body", async () => {
    const action = vi.fn();
    render(wrap(<TestimonialForm masters={masters} action={action} />));
    fireEvent.change(screen.getByLabelText(/Master/i), { target: { value: "m1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() =>
      expect(screen.getByText(/Please write a few words/i)).toBeVisible(),
    );
    expect(action).not.toHaveBeenCalled();
  });
});
