import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  setAdminNoteAction: vi.fn(),
}));

import { AdminNoteForm } from "./admin-note-form";

const meta: Meta<typeof AdminNoteForm> = {
  component: AdminNoteForm,
  args: {
    userId: "tg:demo",
    helperLabel: "Only admins see this.",
    saveLabel: "Save",
    savedLabel: "Saved",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof AdminNoteForm>;
export const Empty: Story = { args: { initialNote: null } };
export const WithNote: Story = {
  args: { initialNote: "Spent over €2k last year. Prefers Mariya." },
};
