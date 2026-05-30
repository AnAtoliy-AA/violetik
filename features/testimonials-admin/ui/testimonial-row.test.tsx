import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialRow } from "./testimonial-row";
import type { AdminTestimonialRow } from "@/db/testimonials";

const baseRow: AdminTestimonialRow = {
  id: "tst_1",
  body: "Beautiful work — the chrome finish lasted three weeks.",
  status: "pending",
  createdAt: new Date("2026-05-20T10:00:00Z"),
  decidedAt: null,
  userId: "tg:42",
  authorFirstName: "Lara",
  authorLastName: "Karimova",
  authorUsername: "lara_k",
  authorEmail: null,
  authorPhotoUrl: null,
  authorIsVip: false,
  masterId: "violetta",
  masterNameEn: "Violetta",
  masterNameRu: "Виолетта",
  masterNameBy: "Віялета",
};

const labels = {
  submittedAt: "Submitted",
  decidedAt: "Decided",
  statusPending: "Pending",
  statusApproved: "Approved",
  statusRejected: "Rejected",
};

describe("TestimonialRow", () => {
  it("renders body, author display, and master name in the requested locale", () => {
    render(<TestimonialRow row={baseRow} locale="ru" labels={labels} />);
    expect(screen.getByText(baseRow.body)).toBeInTheDocument();
    expect(screen.getByText("Lara K.")).toBeInTheDocument();
    expect(screen.getByText("Виолетта")).toBeInTheDocument();
  });

  it("shows the decision slot when provided", () => {
    render(
      <TestimonialRow
        row={baseRow}
        locale="en"
        labels={labels}
        decisionSlot={<button>Approve me</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Approve me" }),
    ).toBeInTheDocument();
  });

  it("omits the decision slot for approved/rejected rows", () => {
    const approved = { ...baseRow, status: "approved" as const };
    render(<TestimonialRow row={approved} locale="en" labels={labels} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the status badge matching row.status", () => {
    const rejected = { ...baseRow, status: "rejected" as const };
    render(<TestimonialRow row={rejected} locale="en" labels={labels} />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders a VIP badge when the author is a VIP", () => {
    const vipRow = { ...baseRow, authorIsVip: true };
    render(<TestimonialRow row={vipRow} locale="en" labels={labels} />);
    expect(screen.getByLabelText("VIP member")).toBeInTheDocument();
  });

  it("does not render a VIP badge for non-VIP authors", () => {
    render(<TestimonialRow row={baseRow} locale="en" labels={labels} />);
    expect(screen.queryByLabelText("VIP member")).not.toBeInTheDocument();
  });
});
