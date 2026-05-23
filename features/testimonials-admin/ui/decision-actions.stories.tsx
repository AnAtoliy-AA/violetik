import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  approveTestimonial: vi.fn(),
  rejectTestimonial: vi.fn(),
}));

import { DecisionActions } from "./decision-actions";

const meta: Meta<typeof DecisionActions> = {
  title: "Features/TestimonialsAdmin/DecisionActions",
  component: DecisionActions,
};
export default meta;

export const Default: StoryObj<typeof DecisionActions> = {
  args: {
    testimonialId: "tst_demo",
    approveLabel: "Approve",
    rejectLabel: "Reject",
  },
};
