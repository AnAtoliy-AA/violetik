import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  setUserRoleAction: vi.fn(),
  setAdminNoteAction: vi.fn(),
  grantVipAction: vi.fn(),
  revokeVipAction: vi.fn(),
  mergeUsersAction: vi.fn(),
}));

import { MergeForm } from "./merge-form";

const baseProps = {
  conflicts: {
    bothPendingVip: false,
    pendingTestimonialCollisions: [] as string[],
  },
  survivorRadioLabel: "Survivor",
  overrideLabels: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    photoUrl: "Photo",
  },
  conflictPendingVipLabel: "Both have a pending VIP",
  conflictPendingTestimonialLabel: "Both have a pending testimonial",
  mergeLabel: "Merge",
  cancelLabel: "Cancel",
  cancelHref: "/admin/users/google:abc",
  a: {
    id: "google:abc",
    firstName: "Vi",
    lastName: "G",
    email: "v@x",
    photoUrl: "https://a",
  },
  b: {
    id: "tg:1",
    firstName: "Vi",
    lastName: "T",
    email: null,
    photoUrl: null,
  },
};

describe("MergeForm", () => {
  it("submits the chosen survivor + overrides", () => {
    const onSubmit = vi.fn();
    render(<MergeForm {...baseProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText(/Last name from tg:1/i));
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    expect(onSubmit).toHaveBeenCalledWith({
      survivorId: "google:abc",
      loserId: "tg:1",
      overrides: {
        firstName: "survivor",
        lastName: "loser",
        email: "survivor",
        photoUrl: "survivor",
      },
    });
  });

  it("disables the merge button when conflicts are present", () => {
    render(
      <MergeForm
        {...baseProps}
        conflicts={{
          bothPendingVip: true,
          pendingTestimonialCollisions: [],
        }}
      />,
    );
    const button = screen.getByRole("button", { name: "Merge" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Both have a pending VIP")).toBeInTheDocument();
  });
});
