import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

// The component imports the server-action module, which pulls `@/auth` and
// indirectly the `next-auth` runtime — both crash in jsdom. Stub the actions
// to no-op shapes so we can mount the client UI in isolation.
const finalizeMock = vi.fn();
vi.mock("../api/upload-studio-photo", () => ({
  finalizeStudioPhotoUploadAction: (...args: unknown[]) => finalizeMock(...args),
  deleteStudioPhotoAction: vi.fn(async () => null),
}));

// @vercel/blob/client `upload` is the client-direct upload entry point.
// In jsdom we mock it to return a stub blob URL.
const uploadMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  upload: (...args: unknown[]) => uploadMock(...args),
}));

import { PhotoUploadRow } from "./photo-upload-row";

function renderRow() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PhotoUploadRow
        slot={{
          kind: "service",
          id: "signature",
          label: "Signature",
          hint: "5:6 portrait",
        }}
        current={null}
        storageConfigured={true}
      />
    </NextIntlClientProvider>,
  );
}

function makeFile(sizeBytes: number, type = "image/jpeg") {
  const file = new File(["x"], "photo.jpg", { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

beforeEach(() => {
  uploadMock.mockReset();
  finalizeMock.mockReset();
});

describe("PhotoUploadRow", () => {
  it("rejects an oversized pick inline with size + suggestion and keeps Upload disabled", async () => {
    renderRow();
    const user = userEvent.setup();

    const oversized = makeFile(26 * 1024 * 1024); // 26 MB, above 25 MB cap

    const fileInput = screen.getByLabelText(/File/);
    await user.upload(fileInput, oversized);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/26\.0\s*MB/);
    expect(alert.textContent).toMatch(/25\s*MB/);
    expect(alert.textContent?.toLowerCase()).toMatch(/compress|resize/);

    expect(
      screen.getByRole("button", { name: /^Upload$/i }),
    ).toBeDisabled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("clears the too-large alert when a new, smaller file is picked", async () => {
    renderRow();
    const user = userEvent.setup();
    const fileInput = screen.getByLabelText(/File/);

    await user.upload(fileInput, makeFile(26 * 1024 * 1024));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.upload(fileInput, makeFile(1 * 1024 * 1024));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not invoke the file-sized server action — upload() goes direct to Blob", async () => {
    renderRow();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(finalizeMock).not.toHaveBeenCalled();
  });
});
