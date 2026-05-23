import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  approveTestimonial: vi.fn(),
  rejectTestimonial: vi.fn(),
}));

import { TestimonialRow } from "./testimonial-row";
import type { TestimonialRowProps } from "./testimonial-row";
import { DecisionActions } from "./decision-actions";

const meta: Meta<typeof TestimonialRow> = {
  title: "Features/TestimonialsAdmin/TestimonialRow",
  component: TestimonialRow,
};
export default meta;

const baseRow: TestimonialRowProps["row"] = {
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

export const Pending: StoryObj<typeof TestimonialRow> = {
  args: {
    row: baseRow,
    locale: "en",
    labels,
    decisionSlot: (
      <DecisionActions
        testimonialId={baseRow.id}
        approveLabel="Approve"
        rejectLabel="Reject"
      />
    ),
  },
};

export const Approved: StoryObj<typeof TestimonialRow> = {
  args: {
    row: { ...baseRow, status: "approved", decidedAt: new Date("2026-05-21T10:00:00Z") },
    locale: "en",
    labels,
  },
};

export const Rejected: StoryObj<typeof TestimonialRow> = {
  args: {
    row: { ...baseRow, status: "rejected", decidedAt: new Date("2026-05-21T10:00:00Z") },
    locale: "en",
    labels,
  },
};
