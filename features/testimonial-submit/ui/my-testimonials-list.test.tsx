import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { MyTestimonialsList } from "./my-testimonials-list";

const messages = {
  Profile: {
    testimonials_empty: "Share a few words about a master.",
    status_pending: "Pending review",
    status_approved: "Published",
    status_rejected: "Not published",
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
});
