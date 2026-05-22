import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CategoryEditor } from "./category-editor";

const meta: Meta<typeof CategoryEditor> = {
  title: "features/services-admin/CategoryEditor",
  component: CategoryEditor,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={en}>
        <div style={{ width: 420 }}>
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof CategoryEditor>;

const noopSubmit = async () => ({ ok: true as const });

export const Create: Story = {
  args: {
    mode: "create",
    initial: {
      id: "",
      nameEn: "",
      nameRu: "",
      nameBe: "",
      sortOrder: 0,
      status: "published",
    },
    onSubmit: noopSubmit,
  },
};

export const Edit: Story = {
  args: {
    mode: "edit",
    initial: {
      id: "care",
      nameEn: "Care",
      nameRu: "Уход",
      nameBe: "Догляд",
      sortOrder: 1,
      status: "published",
    },
    onSubmit: noopSubmit,
  },
};

export const ArchiveBlocked: Story = {
  args: {
    ...Edit.args,
    archiveBlockingCount: 3,
  } as never,
};
