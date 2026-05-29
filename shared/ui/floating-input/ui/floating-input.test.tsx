import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingInput } from "./floating-input";

describe("FloatingInput", () => {
  it("renders the label and associates it with the input", () => {
    render(<FloatingInput label="Email" name="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "email");
  });

  it("starts with the label in eyebrow position when empty", () => {
    render(<FloatingInput label="Email" />);
    expect(screen.getByText("Email")).toHaveClass("font-mono");
  });

  it("elevates the label to italic when the input has a value (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<FloatingInput label="Email" />);
    await user.type(screen.getByLabelText("Email"), "a");
    expect(screen.getByText("Email")).toHaveClass("font-display");
  });

  it("elevates the label when given a defaultValue", () => {
    render(<FloatingInput label="Email" defaultValue="hi@studio.io" />);
    expect(screen.getByText("Email")).toHaveClass("font-display");
  });

  it("renders an error message with role=alert and rose border", () => {
    render(<FloatingInput label="Email" error="Required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders a hint when no error is set", () => {
    render(<FloatingInput label="Email" hint="We will only message you." />);
    expect(screen.getByText("We will only message you.")).toBeInTheDocument();
  });
});

describe("FloatingInput — glass container", () => {
  it("wraps input in a GlassSurface", () => {
    render(<FloatingInput label="Email" />);
    const input = screen.getByLabelText("Email");
    const surface = input.closest("[data-glass]");
    expect(surface).not.toBeNull();
    expect(surface?.getAttribute("data-glass")).toBe("true");
  });

  it("toggles --rim-opacity on focus and blur", () => {
    render(<FloatingInput label="Email" />);
    const input = screen.getByLabelText("Email");
    const surface = input.closest("[data-glass]") as HTMLElement;
    expect(surface.style.getPropertyValue("--rim-opacity")).toBe("0");
    fireEvent.focus(input);
    expect(surface.style.getPropertyValue("--rim-opacity")).toBe("1");
    fireEvent.blur(input);
    expect(surface.style.getPropertyValue("--rim-opacity")).toBe("0");
  });
});
