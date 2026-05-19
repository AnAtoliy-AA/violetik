import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children and is clickable", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Press
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies gold variant styling", () => {
    render(<Button variant="gold">Reserve</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-gold");
  });

  it("applies outline variant styling", () => {
    render(<Button variant="outline">More</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("renders full-width when block is true", () => {
    render(<Button block>Full</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("renders an icon node before children when icon prop is set", () => {
    render(<Button icon={<svg data-testid="ic" aria-hidden />}>Save</Button>);
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });
});
