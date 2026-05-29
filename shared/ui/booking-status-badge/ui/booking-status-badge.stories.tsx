import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookingStatusBadge } from "./booking-status-badge";

const meta: Meta<typeof BookingStatusBadge> = {
  title: "shared/ui/BookingStatusBadge",
  component: BookingStatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["pending", "confirmed", "cancelled", "completed"],
    },
    label: { control: "text" },
  },
  args: { status: "pending", label: "Pending" },
};
export default meta;
type Story = StoryObj<typeof BookingStatusBadge>;

export const Default: Story = {};
export const Pending: Story = { args: { status: "pending", label: "Pending" } };
export const Confirmed: Story = {
  args: { status: "confirmed", label: "Confirmed" },
};
export const Cancelled: Story = {
  args: { status: "cancelled", label: "Cancelled" },
};
export const Completed: Story = {
  args: { status: "completed", label: "Completed" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <BookingStatusBadge status="pending" label="Pending" />
      <BookingStatusBadge status="confirmed" label="Confirmed" />
      <BookingStatusBadge status="cancelled" label="Cancelled" />
      <BookingStatusBadge status="completed" label="Completed" />
    </div>
  ),
};
