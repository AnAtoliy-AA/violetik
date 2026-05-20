import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: signInMock }));

import { GoogleSignInButton } from "./google-sign-in-button";

describe("GoogleSignInButton", () => {
  it("renders the label and Google glyph", () => {
    render(<GoogleSignInButton label="Sign in with Google" />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeInTheDocument();
  });

  it("invokes next-auth signIn('google') with the callbackUrl when clicked", async () => {
    render(
      <GoogleSignInButton label="Sign in with Google" callbackUrl="/admin" />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /sign in with google/i }),
    );
    expect(signInMock).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
    });
  });
});
