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

import { AdminNoteForm } from "./admin-note-form";

describe("AdminNoteForm", () => {
  it("renders the initial value and submits the edited one", () => {
    const onSubmit = vi.fn();
    render(
      <AdminNoteForm
        userId="tg:1"
        initialNote="hello"
        helperLabel="Only admins see this."
        saveLabel="Save"
        savedLabel="Saved"
        onSubmit={onSubmit}
      />,
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("hello");
    fireEvent.change(textarea, { target: { value: "world" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith("world");
  });

  it("submits null when textarea is cleared (whitespace counts as empty)", () => {
    const onSubmit = vi.fn();
    render(
      <AdminNoteForm
        userId="tg:1"
        initialNote="hello"
        helperLabel="Only admins see this."
        saveLabel="Save"
        savedLabel="Saved"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });
});
