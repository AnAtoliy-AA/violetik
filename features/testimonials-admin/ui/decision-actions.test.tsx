import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api/actions", () => ({
  approveTestimonial: vi.fn(),
  rejectTestimonial: vi.fn(),
}));

import { approveTestimonial, rejectTestimonial } from "../api/actions";
import { DecisionActions } from "./decision-actions";

beforeEach(() => {
  vi.mocked(approveTestimonial).mockReset();
  vi.mocked(rejectTestimonial).mockReset();
});

describe("DecisionActions", () => {
  it("renders Approve and Reject buttons with provided labels", () => {
    render(
      <DecisionActions
        testimonialId="tst_1"
        approveLabel="Approve"
        rejectLabel="Reject"
      />,
    );
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("calls approveTestimonial(id) when Approve is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(approveTestimonial).mockResolvedValue({ ok: true, id: "tst_1" });
    render(
      <DecisionActions
        testimonialId="tst_1"
        approveLabel="Approve"
        rejectLabel="Reject"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(approveTestimonial).toHaveBeenCalledWith("tst_1");
  });

  it("calls rejectTestimonial(id) when Reject is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(rejectTestimonial).mockResolvedValue({ ok: true, id: "tst_1" });
    render(
      <DecisionActions
        testimonialId="tst_1"
        approveLabel="Approve"
        rejectLabel="Reject"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(rejectTestimonial).toHaveBeenCalledWith("tst_1");
  });
});
