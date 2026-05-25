import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toast } from "./toast";
import { ToastProvider, useToast } from "./toast-provider";

const meta: Meta<typeof Toast> = {
  title: "shared/ui/Toast",
  component: Toast,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Toast>;

const dismiss = () => {};

export const Info: Story = {
  args: {
    toast: {
      id: "x",
      intent: "info",
      eyebrow: "· COPIED ·",
      body: "Address copied to clipboard.",
    },
    onDismiss: dismiss,
  },
};

export const Success: Story = {
  args: {
    toast: {
      id: "x",
      intent: "success",
      eyebrow: "· CONFIRMED ·",
      body: "Your appointment is in the book.",
    },
    onDismiss: dismiss,
  },
};

export const Warn: Story = {
  args: {
    toast: {
      id: "x",
      intent: "warn",
      eyebrow: "· LAST ONE ·",
      body: "Only one slot remains at 21:00.",
    },
    onDismiss: dismiss,
  },
};

export const Error: Story = {
  args: {
    toast: {
      id: "x",
      intent: "error",
      eyebrow: "· COULDN'T SAVE ·",
      body: "We lost the connection — try again.",
    },
    onDismiss: dismiss,
  },
};

function Trigger() {
  const { push } = useToast();
  return (
    <button
      type="button"
      className="rounded-full bg-gold text-bg px-4 h-10 text-sm"
      onClick={() =>
        push({
          intent: "success",
          eyebrow: "· COPIED ·",
          body: "Studio address copied.",
        })
      }
    >
      Trigger a toast
    </button>
  );
}

export const WithProvider: Story = {
  render: () => (
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  ),
};
