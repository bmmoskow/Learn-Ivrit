import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../../supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
            }),
          }),
        }),
      }),
    }),
  },
}));

describe("useAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state", async () => {
    const { useAdmin } = await import("./useAdmin");
    const { result } = renderHook(() => useAdmin());
    expect(result.current.logs).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.period).toBe("7d");
    expect(result.current.typeFilter).toBe("");
  });

  it("provides setter functions", async () => {
    const { useAdmin } = await import("./useAdmin");
    const { result } = renderHook(() => useAdmin());

    act(() => {
      result.current.setPeriod("30d");
      result.current.setTypeFilter("translate");
    });

    expect(result.current.period).toBe("30d");
    expect(result.current.typeFilter).toBe("translate");
  });

  it("provides fetchLogs function", async () => {
    const { useAdmin } = await import("./useAdmin");
    const { result } = renderHook(() => useAdmin());
    expect(typeof result.current.fetchLogs).toBe("function");
  });
});
