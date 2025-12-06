import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { useDashboard } from "./useDashboard";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";

const mockUser = { id: "test-user-id", email: "test@example.com" };
const mockSession = { user: mockUser };

// Mock Supabase client
vi.mock("../../integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-id", email: "test@example.com" } } },
        error: null
      }),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        // Immediately invoke callback with signed-in state
        setTimeout(() => callback("SIGNED_IN", { user: { id: "test-user-id", email: "test@example.com" } }), 0);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial loading state", () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it("returns stats object", () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });
    expect(result.current.stats).toBeDefined();
  });

  it("provides loadDashboardData function", () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });
    expect(typeof result.current.loadDashboardData).toBe("function");
  });

});
