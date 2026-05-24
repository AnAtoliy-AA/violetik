import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the server-action module so the next-auth → next/server chain
// doesn't blow up in the jsdom test environment.
const editMock = vi.fn(async () => ({ ok: true as const }));
const removalMock = vi.fn(async () => ({ ok: true as const }));
const cancelMock = vi.fn(async () => ({ ok: true as const }));
vi.mock("../api/change-request-actions", () => ({
  requestTestimonialEditAction: (...args: unknown[]) => editMock(...args),
  requestTestimonialRemovalAction: (...args: unknown[]) => removalMock(...args),
  cancelTestimonialChangeRequestAction: (...args: unknown[]) =>
    cancelMock(...args),
}));

import { MyTestimonialsList } from "./my-testimonials-list";

const messages = {
  Profile: {
    testimonials_empty: "Share a few words about a master.",
    status_pending: "Pending review",
    status_approved: "Published",
    status_rejected: "Not published",
    testimonials_request_edit: "Request edit",
    testimonials_request_removal: "Request removal",
    testimonials_request_edit_pending: "Edit pending admin review",
    testimonials_request_removal_pending: "Removal pending admin review",
    testimonials_cancel_request: "Cancel request",
    testimonials_submit_edit: "Submit edit",
    testimonials_cancel: "Cancel",
    testimonials_confirm_removal: "Confirm?",
    testimonials_confirm_removal_yes: "Yes",
  },
};

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

const baseRow = {
  id: "tst_1",
  userId: "tg:1",
  masterId: "m1",
  body: "She is wonderful.",
  pendingEditBody: null as string | null,
  pendingRemoval: false,
  changeRequestedAt: null as Date | null,
  decidedAt: null,
  decidedBy: null,
  createdAt: new Date("2026-05-20T10:00:00Z"),
  updatedAt: new Date("2026-05-20T10:00:00Z"),
};

describe("MyTestimonialsList", () => {
  it("shows the empty state when there are no rows", () => {
    render(wrap(<MyTestimonialsList rows={[]} masterNameById={{ m1: "Violetta" }} />));
    expect(screen.getByText(/Share a few words about a master/i)).toBeVisible();
  });

  it("renders each status with the right pill copy", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[
            { ...baseRow, id: "a", status: "pending" },
            { ...baseRow, id: "b", status: "approved" },
            { ...baseRow, id: "c", status: "rejected" },
          ]}
          masterNameById={{ m1: "Violetta" }}
        />,
      ),
    );
    expect(screen.getByText("Pending review")).toBeVisible();
    expect(screen.getByText("Published")).toBeVisible();
    expect(screen.getByText("Not published")).toBeVisible();
  });

  it("shows '(unknown master)' if the lookup map is missing the master", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[{ ...baseRow, status: "pending" }]}
          masterNameById={{}}
        />,
      ),
    );
    expect(screen.getByText(/unknown master/i)).toBeVisible();
  });

  it("offers request-edit and request-removal buttons on approved rows with no open request", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[{ ...baseRow, status: "approved" }]}
          masterNameById={{ m1: "Violetta" }}
        />,
      ),
    );
    expect(screen.getByRole("button", { name: /Request edit/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Request removal/i }),
    ).toBeVisible();
  });

  it("shows the pending-edit chip with a cancel button when pendingEditBody is set", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[
            {
              ...baseRow,
              status: "approved",
              pendingEditBody: "Updated wording.",
              changeRequestedAt: new Date(),
            },
          ]}
          masterNameById={{ m1: "Violetta" }}
        />,
      ),
    );
    expect(screen.getByText("Edit pending admin review")).toBeVisible();
    expect(screen.getByText("Updated wording.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Cancel request/i }),
    ).toBeVisible();
  });

  it("calls the edit action when the user submits an edit", async () => {
    editMock.mockClear();
    const user = userEvent.setup();
    render(
      wrap(
        <MyTestimonialsList
          rows={[{ ...baseRow, status: "approved" }]}
          masterNameById={{ m1: "Violetta" }}
        />,
      ),
    );
    await user.click(screen.getByRole("button", { name: /Request edit/i }));
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "New body");
    await user.click(screen.getByRole("button", { name: /Submit edit/i }));
    expect(editMock).toHaveBeenCalledWith({
      testimonialId: "tst_1",
      body: "New body",
    });
  });

  it("hides 'removed' rows entirely", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[
            { ...baseRow, id: "a", status: "removed" },
            { ...baseRow, id: "b", status: "approved" },
          ]}
          masterNameById={{ m1: "Violetta" }}
        />,
      ),
    );
    expect(
      screen.queryByRole("button", { name: /Cancel request/i }),
    ).not.toBeInTheDocument();
    // Only one row rendered (approved)
    expect(screen.getAllByText("Violetta")).toHaveLength(1);
  });
});
