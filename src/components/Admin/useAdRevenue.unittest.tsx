import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAdRevenue } from "./useAdRevenue";

const mockPageViewData = [
  {
    page: "/",
    view_date: "2024-03-15",
    view_count: 100,
    total_active_seconds: 5000,
  },
  {
    page: "/vocabulary",
    view_date: "2024-03-14",
    view_count: 75,
    total_active_seconds: 3000,
  },
  {
    page: "/test",
    view_date: "2024-03-13",
    view_count: 50,
    total_active_seconds: 2000,
  },
];

const mockAdNetworkPolicies = [
  {
    id: "1",
    network_name: "Google AdSense",
    tier_name: "Standard",
    display_cpm: 2.5,
    video_cpm: 5.0,
    display_fill_rate: 0.8,
    video_fill_rate: 0.6,
    refresh_interval_seconds: 30,
    revenue_share_percent: 68,
    min_monthly_pageviews: 0,
    min_requirements_notes: null,
    source_url: null,
    cpm_source_url: null,
  },
  {
    id: "2",
    network_name: "Mediavine",
    tier_name: "Journey",
    display_cpm: 15.0,
    video_cpm: 25.0,
    display_fill_rate: 0.95,
    video_fill_rate: 0.85,
    refresh_interval_seconds: 30,
    revenue_share_percent: 75,
    min_monthly_pageviews: 50000,
    min_requirements_notes: "Requires 50k sessions/month",
    source_url: "https://mediavine.com",
    cpm_source_url: "https://mediavine.com/rates",
  },
  {
    id: "3",
    network_name: "Ezoic",
    tier_name: "Basic",
    display_cpm: 8.0,
    video_cpm: 12.0,
    display_fill_rate: 0.9,
    video_fill_rate: 0.75,
    refresh_interval_seconds: 30,
    revenue_share_percent: 90,
    min_monthly_pageviews: 10000,
    min_requirements_notes: null,
    source_url: null,
    cpm_source_url: null,
  },
];

vi.mock("../../../supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useAdRevenue", () => {
  let mockSupabase: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import("../../../supabase/client");
    mockSupabase = supabase;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "page_views_daily") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockPageViewData,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_network_policies") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAdNetworkPolicies,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useAdRevenue());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.period).toBe("30d");
    expect(typeof result.current.setPeriod).toBe("function");
    expect(typeof result.current.refetch).toBe("function");
  });

  it("fetches and calculates engagement totals correctly", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.engagement.totalViews).toBe(225); // 100 + 75 + 50
    expect(result.current.data?.engagement.totalActiveSeconds).toBe(10000); // 5000 + 3000 + 2000
    expect(result.current.data?.engagement.totalActiveMinutes).toBe(167); // 10000 / 60 rounded
    expect(result.current.data?.engagement.avgSessionSeconds).toBe(44); // 10000 / 225 rounded
  });

  it("calculates revenue estimates for each network", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.networkEstimates).toHaveLength(3);

    const googleEstimate = result.current.data?.networkEstimates.find(
      (e) => e.policy.network_name === "Google AdSense"
    );
    expect(googleEstimate).toBeDefined();
    expect(googleEstimate?.displayImpressions).toBeGreaterThan(0);
    expect(googleEstimate?.videoImpressions).toBeGreaterThan(0);
    expect(googleEstimate?.grossDisplayRevenue).toBeGreaterThan(0);
    expect(googleEstimate?.grossVideoRevenue).toBeGreaterThan(0);
    expect(googleEstimate?.netDisplayRevenue).toBeGreaterThan(0);
    expect(googleEstimate?.netVideoRevenue).toBeGreaterThan(0);
    expect(googleEstimate?.netTotalRevenue).toBeGreaterThan(0);
  });

  it("applies revenue share percentage correctly", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleEstimate = result.current.data?.networkEstimates.find(
      (e) => e.policy.network_name === "Google AdSense"
    );

    if (googleEstimate) {
      const expectedNetDisplay = googleEstimate.grossDisplayRevenue * 0.68;
      const expectedNetVideo = googleEstimate.grossVideoRevenue * 0.68;
      const expectedTotal = expectedNetDisplay + expectedNetVideo;

      expect(googleEstimate.netDisplayRevenue).toBeCloseTo(expectedNetDisplay, 2);
      expect(googleEstimate.netVideoRevenue).toBeCloseTo(expectedNetVideo, 2);
      expect(googleEstimate.netTotalRevenue).toBeCloseTo(expectedTotal, 2);
    }
  });

  it("determines if network minimum requirements are met", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleEstimate = result.current.data?.networkEstimates.find(
      (e) => e.policy.network_name === "Google AdSense"
    );
    const mediavineEstimate = result.current.data?.networkEstimates.find(
      (e) => e.policy.network_name === "Mediavine"
    );

    expect(googleEstimate?.meetsMinimum).toBe(true); // No minimum
    expect(mediavineEstimate?.meetsMinimum).toBe(false); // Requires 50k monthly
  });

  it("sorts estimates by minimum pageviews ascending", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const estimates = result.current.data?.networkEstimates || [];
    expect(estimates[0].policy.min_monthly_pageviews).toBeLessThanOrEqual(
      estimates[1].policy.min_monthly_pageviews
    );
    expect(estimates[1].policy.min_monthly_pageviews).toBeLessThanOrEqual(
      estimates[2].policy.min_monthly_pageviews
    );
  });

  it("handles page views fetch error gracefully", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "page_views_daily") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Failed to fetch" },
              }),
            }),
          }),
        };
      }
      if (table === "ad_network_policies") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAdNetworkPolicies,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to fetch page views:",
      expect.objectContaining({ message: "Failed to fetch" })
    );

    consoleSpy.mockRestore();
  });

  it("handles ad policies fetch error gracefully", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "page_views_daily") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockPageViewData,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_network_policies") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Failed to fetch policies" },
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to fetch ad policies:",
      expect.objectContaining({ message: "Failed to fetch policies" })
    );

    consoleSpy.mockRestore();
  });

  it("handles empty data gracefully", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }));

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.engagement.totalViews).toBe(0);
    expect(result.current.data?.engagement.totalActiveSeconds).toBe(0);
    expect(result.current.data?.engagement.avgSessionSeconds).toBe(0);
    expect(result.current.data?.networkEstimates).toHaveLength(0);
  });

  it("calculates correct date range based on period", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const pageViewsCall = mockSupabase.from.mock.calls.find(
      (call) => call[0] === "page_views_daily"
    );
    expect(pageViewsCall).toBeDefined();
  });

  it("refetches data when refetch is called", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = mockSupabase.from.mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(mockSupabase.from.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("includes period in returned data", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.period).toBe("30d");
  });

  it("calculates impressions with fill rate correctly", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleEstimate = result.current.data?.networkEstimates.find(
      (e) => e.policy.network_name === "Google AdSense"
    );

    if (googleEstimate) {
      const totalActiveSeconds = 10000;
      const refreshInterval = 30;
      const displayFillRate = 0.8;
      const videoFillRate = 0.6;

      const expectedDisplayImpressions = Math.floor(
        Math.floor(totalActiveSeconds / refreshInterval) * displayFillRate
      );
      const expectedVideoImpressions = Math.floor(
        Math.floor(totalActiveSeconds / refreshInterval) * videoFillRate
      );

      expect(googleEstimate.displayImpressions).toBe(expectedDisplayImpressions);
      expect(googleEstimate.videoImpressions).toBe(expectedVideoImpressions);
    }
  });

  it("scales pageviews to monthly for minimum comparison", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "page_views_daily") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    page: "/",
                    view_date: "2024-03-15",
                    view_count: 3000,
                    total_active_seconds: 50000,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockAdNetworkPolicies,
            error: null,
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const ezoicEstimate = result.current.data?.networkEstimates.find(
      (e) => e.policy.network_name === "Ezoic"
    );

    expect(ezoicEstimate?.meetsMinimum).toBe(false);
  });
});
