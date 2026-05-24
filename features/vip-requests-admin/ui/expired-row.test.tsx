import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpiredRowMeta } from "./expired-row";

describe("ExpiredRowMeta", () => {
  it("renders the expiredAtLabel text", () => {
    render(
      <ExpiredRowMeta
        expiredAt={new Date("2026-01-01T00:00:00Z")}
        expiredAtLabel="Expired Jan 01"
      />,
    );
    expect(screen.getByText("Expired Jan 01")).toBeInTheDocument();
  });
});
