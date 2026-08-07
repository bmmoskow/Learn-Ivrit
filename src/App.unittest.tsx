import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

// usePageTracking fires an analytics RPC as a side effect; irrelevant to routing
// and not mocked globally, so stub it to a no-op for this test.
vi.mock("./hooks/usePageTracking/usePageTracking", () => ({
  usePageTracking: () => {},
}));

import App from "./App";

// Guards issue #155: an unmatched URL must render the NotFound (404) screen via
// the catch-all route in App.tsx, not a blank page. This renders the real App
// (not an isolated route config) so the actual wiring is under test.
describe("App routing — catch-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // NotFound logs a console.error on mount by design; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the 404 page for an unmatched URL", async () => {
    render(
      <MemoryRouter initialEntries={["/this-route-does-not-exist"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("Oops! Page not found")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
