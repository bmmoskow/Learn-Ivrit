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

const mockAdNetworkConfig = {
  config: {
    programs: {
      google_adsense: {
        company: "Google",
        official_url: "https://www.google.com/adsense/start/",
        cpm: {
          value: "$1.5",
          source: "https://example.com/cpm",
          confidence: "medium",
        },
        traffic_requirement: {
          value: "No minimum traffic requirement",
          source: "https://example.com/req",
          confidence: "high",
        },
        strategies: [
          {
            name: "single_high_viewability_unit",
            description: "Use one strong above-the-fold unit",
            formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
          },
          {
            name: "balanced_multi_slot_layout",
            description: "Use moderate in-content and sidebar units",
            formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
          },
        ],
      },
      mediavine_core: {
        company: "Mediavine",
        official_url: "https://www.mediavine.com/publisher-network/",
        cpm: {
          value: "$15",
          source: "https://example.com/mv-cpm",
          confidence: "low",
        },
        traffic_requirement: {
          value: "50,000 sessions/month",
          source: "https://example.com/mv-req",
          confidence: "high",
        },
        strategies: [
          {
            name: "session_depth_strategy",
            description: "Increase pages per session",
            formula: "estimated_revenue = (sessions * pages_per_session * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
          },
        ],
      },
    },
  },
};

vi.mock("../../../supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useAdRevenue", () => {
  let mockSupabase: { from: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import("../../../supabase/client");
    mockSupabase = supabase as unknown as { from: ReturnType<typeof vi.fn> };

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
      if (table === "ad_config") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockAdNetworkConfig,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
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
    expect(result.current.data?.engagement.totalViews).toBe(225);
    expect(result.current.data?.engagement.totalActiveSeconds).toBe(10000);
    expect(result.current.data?.engagement.totalActiveMinutes).toBe(167);
    expect(result.current.data?.engagement.avgSessionSeconds).toBe(44);
  });

  it("parses JSON config and generates strategy estimates", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.strategyEstimates).toHaveLength(3);

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense" && s.strategyName === "single_high_viewability_unit"
    );
    expect(googleStrategy).toBeDefined();
    expect(googleStrategy?.programName).toBe("Google");
    expect(googleStrategy?.cpm).toBe(1.5);
    expect(googleStrategy?.estimatedRevenue).toBeGreaterThan(0);
    expect(googleStrategy?.estimatedImpressions).toBeGreaterThan(0);
    expect(googleStrategy?.estimatedRpm).toBeGreaterThan(0);
  });

  it("determines if traffic requirements are met", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense"
    );
    const mediavineStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "mediavine_core"
    );

    expect(googleStrategy?.meetsRequirements).toBe(true);
    expect(mediavineStrategy?.meetsRequirements).toBe(false);
  });

  it("sorts strategies by traffic requirements ascending", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategies = result.current.data?.strategyEstimates || [];
    expect(strategies[0].programKey).toBe("google_adsense");
    expect(strategies[strategies.length - 1].programKey).toBe("mediavine_core");
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
      if (table === "ad_config") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockAdNetworkConfig,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
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

  it("handles config fetch error gracefully", async () => {
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
      if (table === "ad_config") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Failed to fetch config" },
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
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
      "Failed to fetch ad config:",
      { message: "Failed to fetch config" }
    );

    consoleSpy.mockRestore();
  });

  it("handles missing config gracefully", async () => {
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
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("No active ad network config found");

    consoleSpy.mockRestore();
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

  it("parses CPM values correctly", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense"
    );
    const mediavineStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "mediavine_core"
    );

    expect(googleStrategy?.cpm).toBe(1.5);
    expect(mediavineStrategy?.cpm).toBe(15);
  });

  it("changes period when setPeriod is called", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.period).toBe("30d");

    act(() => {
      result.current.setPeriod("7d");
    });

    await waitFor(() => {
      expect(result.current.period).toBe("7d");
    });
  });

  it("includes strategy metadata in estimates", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense" && s.strategyName === "single_high_viewability_unit"
    );

    expect(googleStrategy?.strategyDescription).toBe("Use one strong above-the-fold unit");
    expect(googleStrategy?.formula).toContain("estimated_revenue");
    expect(googleStrategy?.officialUrl).toBe("https://www.google.com/adsense/start/");
    expect(googleStrategy?.cpmSource).toBe("https://example.com/cpm");
    expect(googleStrategy?.trafficRequirementSource).toBe("https://example.com/req");
  });

  it("calculates all strategies for each program", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategies = result.current.data?.strategyEstimates.filter(
      (s) => s.programKey === "google_adsense"
    );

    expect(googleStrategies?.length).toBe(2);
    expect(googleStrategies?.map((s) => s.strategyName)).toContain("single_high_viewability_unit");
    expect(googleStrategies?.map((s) => s.strategyName)).toContain("balanced_multi_slot_layout");
  });

  it("handles empty page views data", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "page_views_daily") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_config") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockAdNetworkConfig,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.engagement.totalViews).toBe(0);
    expect(result.current.data?.engagement.totalActiveSeconds).toBe(0);
    expect(result.current.data?.engagement.avgSessionSeconds).toBe(0);
  });

  it("correctly identifies programs with no minimum traffic", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense"
    );

    expect(googleStrategy?.trafficRequirement).toBe("No minimum traffic requirement");
    expect(googleStrategy?.meetsRequirements).toBe(true);
  });

  it("extracts numeric values from traffic requirements for sorting", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategies = result.current.data?.strategyEstimates || [];

    const googleIdx = strategies.findIndex((s) => s.programKey === "google_adsense");
    const mediavineIdx = strategies.findIndex((s) => s.programKey === "mediavine_core");

    expect(googleIdx).toBeLessThan(mediavineIdx);
  });

  it("includes all required fields in strategy estimates", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategy = result.current.data?.strategyEstimates[0];

    expect(strategy).toHaveProperty("programKey");
    expect(strategy).toHaveProperty("programName");
    expect(strategy).toHaveProperty("strategyName");
    expect(strategy).toHaveProperty("strategyDescription");
    expect(strategy).toHaveProperty("officialUrl");
    expect(strategy).toHaveProperty("cpm");
    expect(strategy).toHaveProperty("estimatedRevenue");
    expect(strategy).toHaveProperty("estimatedImpressions");
    expect(strategy).toHaveProperty("estimatedRpm");
    expect(strategy).toHaveProperty("meetsRequirements");
    expect(strategy).toHaveProperty("formula");
    expect(strategy).toHaveProperty("trafficRequirement");
  });

  it("calculates RPM correctly from revenue and page views", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategy = result.current.data?.strategyEstimates[0];
    const totalViews = result.current.data?.engagement.totalViews || 1;

    const expectedRpm = (strategy!.estimatedRevenue / totalViews) * 1000;
    expect(Math.abs(strategy!.estimatedRpm - expectedRpm)).toBeLessThan(0.01);
  });

  it("sets loading to true during refetch", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles malformed CPM values gracefully", async () => {
    const malformedConfig = {
      config: {
        programs: {
          test_network: {
            company: "Test Network",
            official_url: "https://test.com",
            cpm: {
              value: "invalid",
              source: "",
              confidence: "low",
            },
            traffic_requirement: {
              value: "None",
              source: "",
              confidence: "high",
            },
            strategies: [
              {
                name: "test_strategy",
                description: "Test",
                formula: "test",
              },
            ],
          },
        },
      },
    };

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
      if (table === "ad_config") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: malformedConfig,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategy = result.current.data?.strategyEstimates[0];
    expect(strategy?.cpm).toBe(0);
  });
});
