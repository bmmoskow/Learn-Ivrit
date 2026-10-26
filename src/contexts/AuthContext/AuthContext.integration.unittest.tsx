import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../../../supabase/client";

// In-process integration test for the AUTH FLOW. Renders the REAL <App/> (real
// AuthProvider + ProtectedRoute + routes) and exercises the auth state machine
// end to end through the mocked Supabase auth client:
//   • sign in (via the Login form) → the app opens on the Dashboard
//   • continue as guest → redirected to the FAQ
//   • sign out → back to the Login screen
// This is the wiring unit tests can't see: that an auth transition actually
// swaps what the router renders.

vi.mock("../../hooks/usePageTracking/usePageTracking", () => ({
  usePageTracking: () => {},
}));

import App from "../../App";

const mockUser: User = {
  id: "user-1",
  email: "learner@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockSession = { user: mockUser, access_token: "token" } as unknown as Session;

// Captured so a test can emit auth events the way Supabase would.
let authCallback: ((event: string, session: Session | null) => void) | undefined;

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

function setSession(session: Session | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.auth as any).getSession = vi.fn(() => Promise.resolve({ data: { session }, error: null }));
}

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

describe("AuthContext integration — auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installSupabaseQueryMock();
    setSession(null);
    authCallback = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth as any).onAuthStateChange = vi.fn((cb: (e: string, s: Session | null) => void) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    vi.mocked(localStorage.getItem).mockReturnValue(null);
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

  it("signs a user in through the Login form and opens the Dashboard", async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth as any).signInWithPassword = vi.fn(() =>
      Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null }),
    );

    renderApp();

    // Starts on the Login screen (logged out on a protected route).
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/your\.email@example\.com/i), mockUser.email!);
    await user.type(screen.getByPlaceholderText(/enter your password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    // A successful sign-in swaps the Login screen for the protected Dashboard.
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /welcome back/i })).not.toBeInTheDocument();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
  });

  it("continues as a guest and redirects to the FAQ", async () => {
    const user = userEvent.setup();

    renderApp();

    await user.click(await screen.findByRole("button", { name: /continue as guest/i }));

    // Generous timeout: the FAQ page cold-imports react-markdown here.
    expect(await screen.findByText("Frequently Asked Questions", {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("signs out from the authenticated app and returns to the Login screen", async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth as any).signOut = vi.fn(() => Promise.resolve({ error: null }));
    setSession(mockSession);

    renderApp();

    // Authenticated: the Dashboard and its navigation chrome are shown.
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    // The nav renders at several breakpoints (all present in jsdom); click one.
    await user.click(screen.getAllByRole("button", { name: /sign out/i })[0]);
    expect(supabase.auth.signOut).toHaveBeenCalled();

    // Supabase then emits SIGNED_OUT, which must clear the session and route
    // back to Login.
    await act(async () => {
      authCallback?.("SIGNED_OUT", null);
    });

    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });
});
