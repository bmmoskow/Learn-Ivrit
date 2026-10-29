import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

// In-process integration test for ROUTING & NAVIGATION WIRING — the class of
// bug unit tests miss (issue #155: every unit passed but the catch-all/route
// wiring was broken, giving a blank 404). This renders the REAL <App/> (real
// AuthProvider, real ProtectedRoute, real route table) inside a MemoryRouter at
// a range of URLs and asserts each lands on the intended screen. Auth state is
// steered through the mocked Supabase client; the Gemini/markdown fetches are
// stubbed so leaf pages settle instead of hanging on the network.

// usePageTracking fires an analytics RPC side effect irrelevant to routing and
// isn't mocked globally — stub it to a no-op (same approach as App.unittest).
vi.mock("./hooks/usePageTracking/usePageTracking", () => ({
  usePageTracking: () => {},
}));

import App from "./App";

const mockUser: User = {
  id: "user-1",
  email: "learner@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockSession = { user: mockUser, access_token: "token" } as unknown as Session;

/** Make every Supabase table read resolve empty so lazy pages render cleanly. */
function installSupabaseQueryMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from = vi.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    const self = () => chain;
    for (const m of ["select", "eq", "gte", "lte", "order", "limit", "insert", "update", "delete", "upsert"]) {
      chain[m] = vi.fn(self);
    }
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
    chain.then = (resolve: (r: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null });
    return chain;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
  // Realtime: AdminCostFooter's useLastTransaction opens a channel when a user
  // is present. Return an inert chainable subscription.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).channel = vi.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch: any = { on: vi.fn(() => ch), subscribe: vi.fn(() => ch), unsubscribe: vi.fn() };
    return ch;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).removeChannel = vi.fn();
}

/** Point AuthProvider's initial getSession at a session (or logged-out). */
function setSession(session: Session | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.auth as any).getSession = vi.fn(() => Promise.resolve({ data: { session }, error: null }));
}

const renderAppAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe("App integration — routing & navigation wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installSupabaseQueryMock();
    setSession(null);
    // Default to not-guest; the guest test overrides this read.
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    // NotFound and some data hooks log by design; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(""),
        } as Response),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a logged-out visitor on a protected route to the Login screen", async () => {
    renderAppAt("/");
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("renders a public route (Terms of Service) without authentication", async () => {
    renderAppAt("/terms");
    // Generous timeout: this is the first test to cold-import react-markdown
    // (the MarkdownPage dependency), which dominates the wait on a fresh run.
    expect(await screen.findByText("Terms of Service", {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("renders the 404 catch-all for an unmatched URL", async () => {
    renderAppAt("/this-route-does-not-exist");
    expect(await screen.findByText("Oops! Page not found")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders the protected Dashboard for an authenticated user", async () => {
    setSession(mockSession);
    renderAppAt("/");
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /welcome back/i })).not.toBeInTheDocument();
  });

  it("redirects a guest landing on / to the FAQ", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => (key === "guestMode" ? "true" : null));
    renderAppAt("/");
    expect(await screen.findByText("Frequently Asked Questions", {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
