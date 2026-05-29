import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AdminImageUpload, type AdminImageUploadLabels } from "./admin-image-upload";

const labels: AdminImageUploadLabels = {
  fileLabel: "Photo file",
  upload: "Upload",
  uploading: "Uploading…",
  remove: "Remove",
  uploaded: "Uploaded",
  errorTooLarge: "Too large (max 8 MB)",
  errorFailed: "Upload failed",
  storageNotConfigured: "Storage not configured",
  idRequired: "Enter an id first",
};

const meta: Meta<typeof AdminImageUpload> = {
  title: "shared/ui/AdminImageUpload",
  component: AdminImageUpload,
  args: {
    keyKind: "gallery",
    id: "g1",
    storageConfigured: true,
    labels,
    onUploaded: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-[420px] bg-bg p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AdminImageUpload>;

export const Empty: Story = {};

export const WithCurrentImage: Story = {
  args: {
    currentSrc:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400",
    onRemoved: () => {},
  },
};

export const StorageNotConfigured: Story = {
  args: { storageConfigured: false },
};
