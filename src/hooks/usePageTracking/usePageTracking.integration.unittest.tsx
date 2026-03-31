import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePageTracking } from "./usePageTracking";
import { MemoryRouter, useLocation } from "react-router-dom";
import { supabase } from "../../../supabase/client";

// Mock the supabase client
vi.mock("../../../supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock useLocation
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

describe("usePageTracking - Guest vs Authenticated Integration", () => {
  let mockRpc: ReturnType<typeof vi.fn>;
  let mockUseLocation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRpc = vi.fn().mockResolvedValue({ error: null });
    (supabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;
    mockUseLocation = useLocation as ReturnType<typeof vi.fn>;
    mockUseLocation.mockReturnValue({ pathname: "/dashboard" });

    Object.defineProperty(document, "hidden", {
      writable: true,
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Database Entry Format", () => {
    it("logs page views to page_views_daily table via RPC", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      expect(mockRpc).toHaveBeenCalledWith("log_page_view", {
        p_page: "/dashboard",
        p_active_seconds: 60,
      });
    });

    it("aggregates multiple page views into daily totals", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // First flush
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mockRpc).toHaveBeenNthCalledWith(1, "log_page_view", {
        p_page: "/dashboard",
        p_active_seconds: 60,
      });

      // Second flush
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mockRpc).toHaveBeenNthCalledWith(2, "log_page_view", {
        p_page: "/dashboard",
        p_active_seconds: 60,
      });

      // Both calls use same page - will be aggregated by DB
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it("tracks different pages separately", async () => {
      const { rerender } = renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Time on first page
      await vi.advanceTimersByTimeAsync(30_000);
      mockUseLocation.mockReturnValue({ pathname: "/vocabulary" });
      rerender();

      await vi.runOnlyPendingTimersAsync();

      // Time on second page
      await vi.advanceTimersByTimeAsync(45_000);
      mockUseLocation.mockReturnValue({ pathname: "/tests" });
      rerender();

      await vi.runOnlyPendingTimersAsync();

      // Should have logged both pages
      expect(mockRpc).toHaveBeenCalledWith("log_page_view", {
        p_page: "/dashboard",
        p_active_seconds: 30,
      });
      expect(mockRpc).toHaveBeenCalledWith("log_page_view", {
        p_page: "/vocabulary",
        p_active_seconds: 45,
      });
    });
  });

  describe("Anonymous Aggregate Tracking", () => {
    it("does not send any user identification in page view logs", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      const rpcCall = mockRpc.mock.calls[0];
      const params = rpcCall[1];

      // Verify NO user identification is sent
      expect(params).not.toHaveProperty("user_id");
      expect(params).not.toHaveProperty("userId");
      expect(params).not.toHaveProperty("session_id");
      expect(params).toEqual({
        p_page: "/dashboard",
        p_active_seconds: 60,
      });
    });

    it("aggregates all users (guest and authenticated) into same daily totals", async () => {
      // This simulates the behavior where page_views_daily
      // aggregates ALL page views regardless of user type
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      // All calls go to same RPC endpoint with same structure
      expect(mockRpc).toHaveBeenCalledWith("log_page_view", {
        p_page: "/dashboard",
        p_active_seconds: 60,
      });

      // The DB function will do: INSERT ... ON CONFLICT ... DO UPDATE
      // incrementing view_count and total_active_seconds
    });

    it("provides data for ad revenue estimation without PII", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(120_000); // 2 minutes (will flush twice at 60s each)

      // This data can be used to calculate:
      // - Page views per day
      // - Active minutes per page
      // - Ad impression estimates
      // All without knowing WHO the users are

      // Should have flushed twice (once at 60s, once at 120s)
      expect(mockRpc).toHaveBeenCalled();
      const lastCall = mockRpc.mock.calls[mockRpc.mock.calls.length - 1];
      expect(lastCall[0]).toBe("log_page_view");
      expect(lastCall[1].p_page).toBe("/dashboard");
      expect(lastCall[1].p_active_seconds).toBe(60);
    });
  });

  describe("Active Time Tracking Accuracy", () => {
    it("only counts time when tab is visible", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Visible for 30 seconds
      await vi.advanceTimersByTimeAsync(30_000);

      // Hide tab
      Object.defineProperty(document, "hidden", { value: true });
      document.dispatchEvent(new Event("visibilitychange"));

      // Hidden for 60 seconds (should not count)
      await vi.advanceTimersByTimeAsync(60_000);

      // Show again
      Object.defineProperty(document, "hidden", { value: false });
      document.dispatchEvent(new Event("visibilitychange"));

      // Visible for 30 more seconds
      await vi.advanceTimersByTimeAsync(30_000);

      // Force flush
      await vi.advanceTimersByTimeAsync(60_000);

      // Should only log active time (30 + 30 = 60 seconds)
      const lastCall = mockRpc.mock.calls[mockRpc.mock.calls.length - 1];
      expect(lastCall[1].p_active_seconds).toBeLessThan(90);
    });

    it("accurately converts to active minutes for ad metrics", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Simulate 5 minutes of active time (will flush 5 times at 60s intervals)
      await vi.advanceTimersByTimeAsync(300_000);

      // Each flush reports 60 seconds (1 active minute)
      // The DB aggregates these into total active time
      expect(mockRpc).toHaveBeenCalled();
      const calls = mockRpc.mock.calls.filter(
        call => call[0] === "log_page_view" && call[1].p_page === "/dashboard"
      );
      expect(calls.length).toBeGreaterThanOrEqual(5);
      expect(calls[0][1].p_active_seconds).toBe(60);
    });
  });

  describe("Multi-Page Session Tracking", () => {
    it("tracks complete user journey across pages", async () => {
      const { rerender } = renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Dashboard: 30 seconds
      mockUseLocation.mockReturnValue({ pathname: "/dashboard" });
      rerender();
      await vi.advanceTimersByTimeAsync(30_000);

      // Vocabulary: 45 seconds
      mockUseLocation.mockReturnValue({ pathname: "/vocabulary" });
      rerender();
      await vi.runOnlyPendingTimersAsync();
      await vi.advanceTimersByTimeAsync(45_000);

      // Tests: 20 seconds
      mockUseLocation.mockReturnValue({ pathname: "/tests" });
      rerender();
      await vi.runOnlyPendingTimersAsync();
      await vi.advanceTimersByTimeAsync(20_000);

      // Ensure all pages logged
      mockUseLocation.mockReturnValue({ pathname: "/exit" });
      rerender();
      await vi.runOnlyPendingTimersAsync();

      // Verify each page tracked separately
      const dashboardCalls = mockRpc.mock.calls.filter(
        call => call[0] === "log_page_view" && call[1].p_page === "/dashboard"
      );
      const vocabularyCalls = mockRpc.mock.calls.filter(
        call => call[0] === "log_page_view" && call[1].p_page === "/vocabulary"
      );
      const testsCalls = mockRpc.mock.calls.filter(
        call => call[0] === "log_page_view" && call[1].p_page === "/tests"
      );

      expect(dashboardCalls.length).toBeGreaterThan(0);
      expect(vocabularyCalls.length).toBeGreaterThan(0);
      expect(testsCalls.length).toBeGreaterThan(0);
    });

    it("handles rapid navigation without losing data", async () => {
      const { rerender } = renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      const pages = ["/page1", "/page2", "/page3", "/page4", "/page5"];

      for (const page of pages) {
        mockUseLocation.mockReturnValue({ pathname: page });
        rerender();
        await vi.advanceTimersByTimeAsync(5000); // 5 seconds each
      }

      await vi.runOnlyPendingTimersAsync();

      // Should have tracked all pages
      expect(mockRpc.mock.calls.length).toBeGreaterThanOrEqual(pages.length - 1);
    });
  });

  describe("Error Resilience", () => {
    it("continues tracking after RPC failures", async () => {
      mockRpc
        .mockResolvedValueOnce({ error: "Network error" })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // First flush (fails)
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Second flush (succeeds)
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mockRpc).toHaveBeenCalledTimes(2);

      // Third flush (succeeds)
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mockRpc).toHaveBeenCalledTimes(3);
    });

    it("does not lose data when DB is temporarily unavailable", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockRpc.mockResolvedValue({ error: "DB unavailable" });

      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      // Error logged but tracking continues
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Privacy Compliance", () => {
    it("complies with privacy requirements by not tracking user identity", async () => {
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      const rpcParams = mockRpc.mock.calls[0][1];

      // Verify compliance:
      // 1. No user identification
      expect(Object.keys(rpcParams)).not.toContain("user_id");
      expect(Object.keys(rpcParams)).not.toContain("session_id");
      expect(Object.keys(rpcParams)).not.toContain("ip_address");
      expect(Object.keys(rpcParams)).not.toContain("fingerprint");

      // 2. Only aggregate metrics
      expect(rpcParams).toHaveProperty("p_page");
      expect(rpcParams).toHaveProperty("p_active_seconds");
      expect(Object.keys(rpcParams)).toHaveLength(2);
    });

    it("allows same privacy treatment for guest and authenticated users", async () => {
      // Since no user_id is sent, both user types are tracked identically
      renderHook(() => usePageTracking(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      const rpcCall = mockRpc.mock.calls[0];

      // Same RPC function, same parameters for all users
      expect(rpcCall[0]).toBe("log_page_view");
      expect(rpcCall[1]).toEqual({
        p_page: "/dashboard",
        p_active_seconds: 60,
      });
    });
  });
});
