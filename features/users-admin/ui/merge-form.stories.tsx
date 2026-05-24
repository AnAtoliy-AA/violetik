import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  mergeUsersAction: vi.fn(),
}));

import { MergeForm } from "./merge-form";

const meta: Meta<typeof MergeForm> = {
  component: MergeForm,
  args: {
    a: {
      id: "google:abc",
      firstName: "Vi",
      lastName: "G",
      email: "v@x.com",
      photoUrl: "https://a",
    },
    b: {
      id: "tg:1",
      firstName: "Vi",
      lastName: "T",
      email: null,
      photoUrl: null,
    },
    conflicts: { bothPendingVip: false, pendingTestimonialCollisions: [] },
    survivorRadioLabel: "Survivor",
    overrideLabels: {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      photoUrl: "Photo URL",
    },
    conflictPendingVipLabel:
      "Both rows have a pending VIP request — cancel one first.",
    conflictPendingTestimonialLabel:
      "Both rows have a pending testimonial for the same master.",
    mergeLabel: "Merge",
    cancelLabel: "Cancel",
    cancelHref: "/admin/users/google:abc",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof MergeForm>;
export const NoConflicts: Story = {};
export const WithConflicts: Story = {
  args: {
    conflicts: { bothPendingVip: true, pendingTestimonialCollisions: ["m1"] },
  },
};
