import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ServiceWorkerRegistrar } from "./service-worker-registrar";

describe("ServiceWorkerRegistrar", () => {
  it("renders null", () => {
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container.firstChild).toBeNull();
  });

  it("does not throw when navigator lacks serviceWorker (jsdom default)", () => {
    // jsdom doesn't ship a serviceWorker by default, so this test
    // exercises the guard. The component must mount silently.
    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
  });
});
