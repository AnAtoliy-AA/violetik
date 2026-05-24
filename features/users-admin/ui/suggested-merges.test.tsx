import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

import { SuggestedMerges } from "./suggested-merges";

const signalLabels = {
  email: "email",
  photo: "photo",
  name: "name",
  "tg-google-handle": "handle",
};

describe("SuggestedMerges", () => {
  it("renders nothing when there are no candidates", () => {
    const { container } = render(
      <SuggestedMerges
        title="Suggested merges"
        reviewLabel="Review merge"
        signalLabels={signalLabels}
        candidates={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each candidate with a linked review URL and signal chips", () => {
    render(
      <SuggestedMerges
        title="Suggested merges"
        reviewLabel="Review merge"
        signalLabels={signalLabels}
        candidates={[
          {
            a: { id: "google:abc", displayName: "Violetta", photoUrl: null },
            b: { id: "tg:1", displayName: "Violetta", photoUrl: null },
            score: 6,
            signals: ["email", "name"],
          },
        ]}
      />,
    );
    expect(screen.getByText("Suggested merges")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Review merge/i });
    // The colon in user ids ("google:abc", "tg:1") is URL-encoded so the
    // path segment travels safely (see the [id] page handler).
    expect(link.getAttribute("href")).toContain(
      "/admin/users/google%3Aabc/merge/tg%3A1",
    );
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
  });
});
