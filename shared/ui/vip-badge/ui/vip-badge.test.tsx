import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VipBadge } from "./vip-badge";

describe("VipBadge", () => {
  it("renders the default VIP label", () => {
    render(<VipBadge />);
    expect(screen.getByText("VIP")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<VipBadge label="VIP+" />);
    expect(screen.getByText("VIP+")).toBeInTheDocument();
  });

  it("exposes an accessible name with the label", () => {
    render(<VipBadge label="VIP" />);
    expect(screen.getByLabelText("VIP member")).toBeInTheDocument();
  });

  it("merges className from props", () => {
    render(<VipBadge className="ml-2" />);
    expect(screen.getByText("VIP")).toHaveClass("ml-2");
  });

  it("applies the xs size utility classes", () => {
    render(<VipBadge size="xs" />);
    expect(screen.getByText("VIP")).toHaveClass("text-[9px]");
  });

  it("applies the sm size utility classes by default", () => {
    render(<VipBadge />);
    expect(screen.getByText("VIP")).toHaveClass("text-[10px]");
  });
});
