import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FloatingInput } from "./floating-input";

const meta: Meta<typeof FloatingInput> = {
  title: "shared/ui/FloatingInput",
  component: FloatingInput,
  tags: ["autodocs"],
  args: { label: "Email" },
};
export default meta;

type Story = StoryObj<typeof FloatingInput>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: "hi@studio.io" } };
export const WithHint: Story = {
  args: { hint: "We will only message you, never call." },
};
export const WithError: Story = {
  args: { defaultValue: "not-an-email", error: "That's not a valid address" },
};

export const Showcase: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-7 bg-bg p-6">
      <FloatingInput label="Email" />
      <FloatingInput label="Name" defaultValue="Violetta" />
      <FloatingInput
        label="Phone"
        hint="Optional · for SMS reminders only."
      />
      <FloatingInput
        label="Telegram"
        defaultValue="@vio"
        error="Username must be at least 5 characters"
      />
    </div>
  ),
};
