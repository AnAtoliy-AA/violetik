import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "./toast";
import { ToastProvider, useToast } from "./toast-provider";

describe("Toast", () => {
  it("renders eyebrow + body + dismiss button", async () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{
          id: "a",
          intent: "success",
          eyebrow: "· CONFIRMED ·",
          body: "Booked.",
        }}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText("· CONFIRMED ·")).toBeInTheDocument();
    expect(screen.getByText("Booked.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledWith("a");
  });

  it("uses role=alert for error intent", () => {
    render(
      <Toast
        toast={{ id: "x", intent: "error", body: "Bad" }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ToastProvider + useToast", () => {
  function Trigger({ duration }: { duration?: number }) {
    const { push } = useToast();
    return (
      <button
        type="button"
        onClick={() =>
          push({ intent: "info", body: "Hello world", duration })
        }
      >
        push
      </button>
    );
  }

  it("pushes a toast on demand", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("push"));
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("removes a toast when its dismiss button is clicked", async () => {
    render(
      <ToastProvider>
        <Trigger duration={0} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("push"));
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => {
      expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
    });
  });

  it("throws when useToast is called without a provider", () => {
    const Bad = () => {
      useToast();
      return null;
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(/useToast/);
    consoleError.mockRestore();
  });
});
