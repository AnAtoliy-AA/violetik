import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { TestimonialForm } from "./testimonial-form";

const messages = {
  Profile: {
    testimonial_form_master: "Master",
    testimonial_form_body: "Your testimonial",
    testimonial_form_submit: "Submit",
    testimonial_form_submitting: "Submitting…",
    testimonial_form_success: "Thank you — your testimonial is pending review.",
    testimonial_form_too_long: "Please keep it under 800 characters.",
    testimonial_form_required: "Please write a few words.",
    testimonial_form_duplicate:
      "You already have a testimonial pending for this master.",
    testimonial_form_invalid_master: "Please pick a master.",
  },
};
const masters = [
  { id: "m1", name: "Violetta" },
  { id: "m2", name: "Sasha" },
];
const meta = {
  title: "Features/TestimonialSubmit/TestimonialForm",
  component: TestimonialForm,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof TestimonialForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { masters, action: async () => ({ ok: true, id: "tst_demo" }) },
};
export const Duplicate: Story = {
  args: {
    masters,
    action: async () => ({ ok: false, reason: "duplicate_pending" }),
  },
};
