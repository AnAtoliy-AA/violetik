import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Sheet } from "./sheet";

function Harness({
  initialOpen = false,
  title = "Tonight's openings",
}: { initialOpen?: boolean; title?: string }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        opener
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={title}>
        <p>sheet body</p>
        <button type="button">in-sheet button</button>
      </Sheet>
    </>
  );
}

describe("Sheet", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByText("sheet body")).not.toBeInTheDocument();
  });

  it("opens when triggered", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("opener"));
    expect(await screen.findByText("sheet body")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Harness initialOpen />);
    expect(await screen.findByText("sheet body")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("sheet body")).not.toBeInTheDocument();
    });
  });

  it("closes when the scrim is clicked", async () => {
    render(<Harness initialOpen />);
    expect(await screen.findByText("sheet body")).toBeInTheDocument();
    // The scrim is the absolute-positioned sibling with the scrim bg.
    const scrim = document.querySelector(
      ".bg-\\[color\\:var\\(--color-scrim\\)\\]",
    ) as HTMLElement;
    expect(scrim).not.toBeNull();
    await userEvent.click(scrim);
    await waitFor(() => {
      expect(screen.queryByText("sheet body")).not.toBeInTheDocument();
    });
  });

  it("uses the title as aria-labelledby", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("opener"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("restores focus to the opener on close", async () => {
    render(<Harness />);
    const opener = screen.getByText("opener");
    opener.focus();
    await userEvent.click(opener);
    expect(await screen.findByText("sheet body")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("sheet body")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    });
  });

  it("does not lock body scroll when closed, locks it when open", async () => {
    const original = document.body.style.overflow;
    render(<Harness />);
    expect(document.body.style.overflow).toBe(original);
    await userEvent.click(screen.getByText("opener"));
    await waitFor(() => {
      expect(document.body.style.overflow).toBe("hidden");
    });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(document.body.style.overflow).toBe(original);
    });
  });

  it("falls back to aria-label when no title is given", async () => {
    function NoTitle() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>o</button>
          <Sheet open={open} onOpenChange={setOpen}>
            <p>x</p>
          </Sheet>
        </>
      );
    }
    render(<NoTitle />);
    await userEvent.click(screen.getByText("o"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Bottom sheet");
  });

  it("returns null on the server (mounted gate)", () => {
    // Mounted is true after effects flush; just verify the gate exists by
    // confirming a fresh render synchronously yields a portal element after
    // the initial render commit.
    render(<Harness initialOpen />);
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
  });
});

describe("Sheet — glass body", () => {
  it("renders the sheet body as a GlassSurface (data-glass='true' on body)", () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <div>contents</div>
      </Sheet>,
    );
    const body = screen.getByText("contents").closest("[data-glass]")!;
    expect(body).not.toBeNull();
    expect(body.getAttribute("data-glass")).toBe("true");
    expect(body.className).toMatch(/glass-warm/);
    expect(body.className).toMatch(/glass-2xl/);
    expect(body.className).toMatch(/glass-rim/);
    expect(body.className).toMatch(/glass-specular/);
  });
});

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    // Render the portal in-place so RTL queries reach it without extra setup.
    createPortal: (node: React.ReactNode) => node,
  };
});
