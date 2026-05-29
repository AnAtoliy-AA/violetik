import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@vercel/blob/client", () => ({ upload: vi.fn() }));

import {
  AdminImageUpload,
  type AdminImageUploadLabels,
} from "./admin-image-upload";

const labels: AdminImageUploadLabels = {
  fileLabel: "Photo file",
  upload: "Upload",
  uploading: "Uploading…",
  remove: "Remove",
  uploaded: "Uploaded",
  errorTooLarge: "Too large",
  errorFailed: "Upload failed",
  storageNotConfigured: "Storage not configured",
  idRequired: "Enter an id first",
};

function setup(over: Partial<React.ComponentProps<typeof AdminImageUpload>> = {}) {
  const onUploaded = vi.fn();
  const onRemoved = vi.fn();
  render(
    <AdminImageUpload
      keyKind="gallery"
      id="g1"
      storageConfigured
      labels={labels}
      onUploaded={onUploaded}
      onRemoved={onRemoved}
      {...over}
    />,
  );
  return { onUploaded, onRemoved };
}

describe("AdminImageUpload", () => {
  it("disables the upload button until a file is chosen", () => {
    setup();
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("shows the storage-not-configured note when storage is off", () => {
    setup({ storageConfigured: false });
    expect(screen.getByText("Storage not configured")).toBeInTheDocument();
  });

  it("offers a Remove button for the current image and fires onRemoved", () => {
    const { onRemoved } = setup({ currentSrc: "https://x/y.jpg" });
    const remove = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(remove);
    expect(onRemoved).toHaveBeenCalledOnce();
  });
});
