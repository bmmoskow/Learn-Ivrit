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
            inputs: {
              pageviews: "Number of page views in the period",
            },
            parameters: {
              ad_slots_per_page: { value: 2, source: "None", confidence: "medium" },
              fill_rate: { value: 0.9, source: "None", confidence: "medium" },
              viewability_rate: { value: 0.7, source: "None", confidence: "medium" },
              cpm: { value: 1.5, source: "None", confidence: "medium" },
              engagement_factor: { value: 1.0, source: "None", confidence: "high" },
              policy_compliance_factor: { value: 1.0, source: "None", confidence: "high" },
            },
          },
          {
            name: "balanced_multi_slot_layout",
            description: "Use moderate in-content and sidebar units",
            formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
            inputs: {
              pageviews: "Number of page views in the period",
            },
            parameters: {
              ad_slots_per_page: { value: 3, source: "None", confidence: "medium" },
              fill_rate: { value: 0.85, source: "None", confidence: "medium" },
              viewability_rate: { value: 0.65, source: "None", confidence: "medium" },
              cpm: { value: 1.5, source: "None", confidence: "medium" },
              engagement_factor: { value: 1.0, source: "None", confidence: "high" },
              policy_compliance_factor: { value: 1.0, source: "None", confidence: "high" },
            },
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
            inputs: {
              sessions: "Number of user sessions",
              pagesPerSession: "Average pages viewed per session",
            },
            parameters: {
              ad_slots_per_page: { value: 4, source: "None", confidence: "medium" },
              fill_rate: { value: 0.95, source: "None", confidence: "high" },
              viewability_rate: { value: 0.75, source: "None", confidence: "high" },
              cpm: { value: 15, source: "None", confidence: "low" },
              engagement_factor: { value: 1.1, source: "None", confidence: "medium" },
            },
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
    expect(googleStrategy?.company).toBe("Google");
    expect(googleStrategy?.cpm).toBe(1.5);
    expect(googleStrategy?.estimatedRevenue).toBeGreaterThan(0);
    expect(googleStrategy?.estimatedImpressions).toBeGreaterThan(0);
    expect(googleStrategy?.estimatedRpm).toBeGreaterThan(0);
    expect(googleStrategy?.inputs).toBeDefined();
    expect(googleStrategy?.inputs?.pageviews).toBe(225);
  });

  it("includes traffic requirement information", async () => {
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

    expect(googleStrategy?.trafficRequirement?.value).toBe("No minimum traffic requirement");
    expect(mediavineStrategy?.trafficRequirement?.value).toBe("50,000 sessions/month");
  });

  it("sorts strategies by estimated revenue descending", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategies = result.current.data?.strategyEstimates || [];
    for (let i = 0; i < strategies.length - 1; i++) {
      expect(strategies[i].estimatedRevenue).toBeGreaterThanOrEqual(strategies[i + 1].estimatedRevenue);
    }
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
    expect(googleStrategy?.programCpm?.source).toBe("https://example.com/cpm");
    expect(googleStrategy?.trafficRequirement?.source).toBe("https://example.com/req");
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

    expect(googleStrategy?.trafficRequirement?.value).toBe("No minimum traffic requirement");
  });

  it("includes all strategies from all programs", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const strategies = result.current.data?.strategyEstimates || [];
    const programKeys = [...new Set(strategies.map((s) => s.programKey))];

    expect(programKeys).toContain("google_adsense");
    expect(programKeys).toContain("mediavine_core");
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
    expect(strategy).toHaveProperty("formula");
    expect(strategy).toHaveProperty("trafficRequirement");
    expect(strategy).toHaveProperty("inputs");
    expect(strategy).toHaveProperty("parameters");
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

  it("populates inputs with actual calculated values", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense" && s.strategyName === "single_high_viewability_unit"
    );
    const mediavineStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "mediavine_core"
    );

    expect(googleStrategy?.inputs).toBeDefined();
    expect(googleStrategy?.inputs?.pageviews).toBe(225);

    expect(mediavineStrategy?.inputs).toBeDefined();
    expect(mediavineStrategy?.inputs?.sessions).toBe(225);
    expect(mediavineStrategy?.inputs?.pagesPerSession).toBe(1);
  });

  it("only includes inputs defined in strategy config", async () => {
    const { result } = renderHook(() => useAdRevenue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const googleStrategy = result.current.data?.strategyEstimates.find(
      (s) => s.programKey === "google_adsense" && s.strategyName === "single_high_viewability_unit"
    );

    expect(googleStrategy?.inputs).toBeDefined();
    expect(Object.keys(googleStrategy?.inputs || {})).toEqual(["pageviews"]);
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
                inputs: {},
                parameters: {
                  cpm: { value: "invalid", source: "None", confidence: "low" },
                },
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

  describe("Active Minutes", () => {
    it("calculates totalActiveMinutes correctly from totalActiveSeconds", async () => {
      const { result } = renderHook(() => useAdRevenue());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.engagement.totalActiveSeconds).toBe(10000);
      expect(result.current.data?.engagement.totalActiveMinutes).toBe(167);
    });

    it("rounds totalActiveMinutes to nearest integer", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "page_views_daily") {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { page: "/", view_date: "2024-03-15", view_count: 100, total_active_seconds: 6550 },
                  ],
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

      expect(result.current.data?.engagement.totalActiveMinutes).toBe(109);
    });

    it("includes activeMinutes in strategy inputs when requested", async () => {
      const configWithActiveMinutes = {
        config: {
          programs: {
            test_network: {
              company: "Test Network",
              strategies: [
                {
                  name: "engagement_based_strategy",
                  description: "Strategy using active minutes",
                  formula: "revenue = activeMinutes * rate",
                  inputs: {
                    pageviews: "Page views",
                    activeMinutes: "Total active minutes",
                  },
                  parameters: {
                    cpm: { value: 2.0, source: "None", confidence: "medium" },
                  },
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
                  data: configWithActiveMinutes,
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
      expect(strategy?.inputs?.activeMinutes).toBe(167);
      expect(strategy?.inputs?.pageviews).toBe(225);
    });

    it("includes active_minutes in strategy inputs with snake_case key", async () => {
      const configWithActiveMinutesSnakeCase = {
        config: {
          programs: {
            test_network: {
              company: "Test Network",
              strategies: [
                {
                  name: "engagement_strategy",
                  description: "Strategy using active_minutes",
                  formula: "revenue = active_minutes * rate",
                  inputs: {
                    active_minutes: "Total active minutes",
                  },
                  parameters: {
                    cpm: { value: 2.0, source: "None", confidence: "medium" },
                  },
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
                  data: configWithActiveMinutesSnakeCase,
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
      expect(strategy?.inputs?.active_minutes).toBe(167);
    });

    it("includes activeSeconds input alongside activeMinutes when both requested", async () => {
      const configWithBothMetrics = {
        config: {
          programs: {
            test_network: {
              company: "Test Network",
              strategies: [
                {
                  name: "dual_metric_strategy",
                  description: "Strategy using both metrics",
                  formula: "revenue = activeSeconds * secondRate + activeMinutes * minuteRate",
                  inputs: {
                    activeSeconds: "Total active seconds",
                    activeMinutes: "Total active minutes",
                  },
                  parameters: {
                    cpm: { value: 2.0, source: "None", confidence: "medium" },
                  },
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
                  data: configWithBothMetrics,
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
      expect(strategy?.inputs?.activeSeconds).toBe(10000);
      expect(strategy?.inputs?.activeMinutes).toBe(167);
    });

    it("calculates activeMinutes as 0 when no active time tracked", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "page_views_daily") {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { page: "/", view_date: "2024-03-15", view_count: 100, total_active_seconds: 0 },
                  ],
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

      expect(result.current.data?.engagement.totalActiveMinutes).toBe(0);
    });

    it("handles fractional minutes correctly with large second values", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "page_views_daily") {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { page: "/", view_date: "2024-03-15", view_count: 1000, total_active_seconds: 123456 },
                  ],
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

      expect(result.current.data?.engagement.totalActiveSeconds).toBe(123456);
      expect(result.current.data?.engagement.totalActiveMinutes).toBe(2058);
    });

    it("ensures activeMinutes calculation consistency across periods", async () => {
      const testData = [
        { page: "/", view_date: "2024-03-15", view_count: 50, total_active_seconds: 3000 },
        { page: "/vocab", view_date: "2024-03-14", view_count: 50, total_active_seconds: 3000 },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "page_views_daily") {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: testData,
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

      const expectedMinutes = Math.round(6000 / 60);
      expect(result.current.data?.engagement.totalActiveMinutes).toBe(expectedMinutes);
      expect(result.current.data?.engagement.totalActiveMinutes).toBe(100);
    });
  });
});
