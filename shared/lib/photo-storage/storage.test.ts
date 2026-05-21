import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We mock @vercel/blob before importing the storage module so the `put`
// and `del` calls happen against an in-memory stub.
const putMock = vi.fn();
const delMock = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
  del: (...args: unknown[]) => delMock(...args),
}));

describe("photo-storage", () => {
  beforeEach(() => {
    vi.resetModules();
    putMock.mockReset();
    delMock.mockReset();
  });

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("returns not_configured when BLOB_READ_WRITE_TOKEN is absent", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const mod = await import("./storage");
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    const result = await mod.uploadPhotoToStorage({
      slotKind: "service",
      slotId: "signature",
      file,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_configured");
    expect(putMock).not.toHaveBeenCalled();
  });

  it("rejects empty files", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    const mod = await import("./storage");
    const file = new File([], "x.jpg", { type: "image/jpeg" });
    const result = await mod.uploadPhotoToStorage({
      slotKind: "service",
      slotId: "signature",
      file,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("empty_file");
  });

  it("rejects oversize files", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    const mod = await import("./storage");
    const big = new Uint8Array(mod.MAX_PHOTO_BYTES + 1);
    const file = new File([big], "x.jpg", { type: "image/jpeg" });
    const result = await mod.uploadPhotoToStorage({
      slotKind: "service",
      slotId: "signature",
      file,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("too_large");
  });

  it("rejects unsupported mime types", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    const mod = await import("./storage");
    const file = new File(["x"], "x.gif", { type: "image/gif" });
    const result = await mod.uploadPhotoToStorage({
      slotKind: "service",
      slotId: "signature",
      file,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("unsupported_type");
  });

  it("uploads valid files and returns the blob URL", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    putMock.mockResolvedValueOnce({
      url: "https://example.public.blob.vercel-storage.com/studio/service/signature-abc.jpg",
    });
    const mod = await import("./storage");
    const file = new File([new Uint8Array(16)], "x.jpg", {
      type: "image/jpeg",
    });
    const result = await mod.uploadPhotoToStorage({
      slotKind: "service",
      slotId: "signature",
      file,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.src).toMatch(/blob\.vercel-storage\.com/);
      expect(result.value.contentType).toBe("image/jpeg");
      expect(result.value.sizeBytes).toBe(16);
    }
    expect(putMock).toHaveBeenCalledOnce();
    const [key, body, options] = putMock.mock.calls[0];
    expect(key).toMatch(/^studio\/service\/signature-[a-z0-9]+\.jpg$/);
    expect(body).toBe(file);
    expect(options).toMatchObject({
      access: "public",
      contentType: "image/jpeg",
    });
  });

  it("returns upload_failed when put throws", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    putMock.mockRejectedValueOnce(new Error("boom"));
    const mod = await import("./storage");
    const file = new File([new Uint8Array(16)], "x.jpg", {
      type: "image/jpeg",
    });
    const result = await mod.uploadPhotoToStorage({
      slotKind: "service",
      slotId: "signature",
      file,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("upload_failed");
  });

  it("isPhotoStorageConfigured reflects the env var", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const mod = await import("./storage");
    expect(mod.isPhotoStorageConfigured()).toBe(false);
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    expect(mod.isPhotoStorageConfigured()).toBe(true);
  });

  it("deletePhotoFromStorage is a no-op when not configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const mod = await import("./storage");
    await mod.deletePhotoFromStorage("https://example.com/foo.jpg");
    expect(delMock).not.toHaveBeenCalled();
  });

  it("deletePhotoFromStorage calls del when configured", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "stub";
    delMock.mockResolvedValueOnce(undefined);
    const mod = await import("./storage");
    await mod.deletePhotoFromStorage("https://example.com/foo.jpg");
    expect(delMock).toHaveBeenCalledWith("https://example.com/foo.jpg");
  });
});
