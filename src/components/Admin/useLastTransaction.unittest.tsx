import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const {
  mockSelect, mockEq, mockGte, mockOrder,
  mockChannel, mockOn, mockSubscribe, mockRemoveChannel,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockGte: vi.fn(),
  mockOrder: vi.fn(),
  mockChannel: vi.fn(),
  mockOn: vi.fn(),
  mockSubscribe: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock("../../../supabase/client", () => ({
  supabase: {
    from: () => ({ select: mockSelect }),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import {
  useLastTransaction,
  notifyNewTransaction,
  clearLastTransaction,
} from "./useLastTransaction";
import type { UsageLogRaw } from "./adminUtils";

const PRICING = {
  prompt_cost_per_million: 1.25,
  candidates_cost_per_million: 5.0,
  thinking_cost_per_million: 10.0,
};

const makeLog = (overrides: Partial<UsageLogRaw> = {}): UsageLogRaw => ({
  id: "log-1",
  user_id: "user-abc",
  request_type: "translate",
  endpoint: "/translate",
  prompt_tokens: 1000,
  candidates_tokens: 500,
  thinking_tokens: 0,
  cache_hit: false,
  created_at: "2024-06-15T10:00:00Z",
  model: "gemini-2.5-flash",
  pricing_id: "pricing-1",
  api_pricing: PRICING,
  ...overrides,
});

function setupSupabaseChain(data: UsageLogRaw[] | null) {
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ gte: mockGte });
  mockGte.mockReturnValue({ order: mockOrder });
  mockOrder.mockResolvedValue({ data });
}

describe("notifyNewTransaction", () => {
  it("dispatches 'api-usage-logged' event", () => {
    const spy = vi.fn();
    window.addEventListener("api-usage-logged", spy);
    notifyNewTransaction();
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("api-usage-logged", spy);
  });
});

describe("clearLastTransaction", () => {
  it("dispatches 'api-usage-cleared' event", () => {
    const spy = vi.fn();
    window.addEventListener("api-usage-cleared", spy);
    clearLastTransaction();
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("api-usage-cleared", spy);
  });
});

describe("useLastTransaction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: { id: "user-abc" } });
    mockChannel.mockReturnValue({ on: mockOn });
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockSubscribe.mockReturnValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns null initially", () => {
    setupSupabaseChain(null);
    const { result } = renderHook(() => useLastTransaction());
    expect(result.current.lastTx).toBeNull();
  });

  it("returns null when user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null });
    setupSupabaseChain([makeLog()]);
    const { result } = renderHook(() => useLastTransaction());
    expect(result.current.lastTx).toBeNull();
  });

  it("aggregates a single API call after clear + notify", async () => {
    const log = makeLog({
      prompt_tokens: 1000,
      candidates_tokens: 500,
      thinking_tokens: 0,
    });
    setupSupabaseChain([log]);

    const { result } = renderHook(() => useLastTransaction());

    // Clear to set operation start, then notify
    act(() => clearLastTransaction());
    expect(result.current.lastTx).toBeNull();

    await act(async () => {
      notifyNewTransaction();
      // Let the async fetch resolve
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx).not.toBeNull();
    expect(result.current.lastTx!.call_count).toBe(1);
    expect(result.current.lastTx!.request_type).toBe("translate");
    expect(result.current.lastTx!.prompt_tokens).toBe(1000);
    expect(result.current.lastTx!.candidates_tokens).toBe(500);
    expect(result.current.lastTx!.cache_hit).toBe(false);
    // cost = 1000 * 1.25/1M + 500 * 5.0/1M = 0.00125 + 0.0025 = 0.00375
    expect(result.current.lastTx!.cost).toBeCloseTo(0.00375);
  });

  it("aggregates multiple API calls (multi-paragraph scenario)", async () => {
    const logs = [
      makeLog({ id: "log-3", prompt_tokens: 800, candidates_tokens: 300, created_at: "2024-06-15T10:02:00Z" }),
      makeLog({ id: "log-2", prompt_tokens: 600, candidates_tokens: 200, created_at: "2024-06-15T10:01:00Z" }),
      makeLog({ id: "log-1", prompt_tokens: 1000, candidates_tokens: 500, created_at: "2024-06-15T10:00:00Z" }),
    ];
    setupSupabaseChain(logs);

    const { result } = renderHook(() => useLastTransaction());

    act(() => clearLastTransaction());
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx!.call_count).toBe(3);
    expect(result.current.lastTx!.prompt_tokens).toBe(2400); // 800+600+1000
    expect(result.current.lastTx!.candidates_tokens).toBe(1000); // 300+200+500
    expect(result.current.lastTx!.request_type).toBe("translate"); // all same type
  });

  it("labels mixed request types as 'mixed'", async () => {
    const logs = [
      makeLog({ id: "log-1", request_type: "translate" }),
      makeLog({ id: "log-2", request_type: "define" }),
    ];
    setupSupabaseChain(logs);

    const { result } = renderHook(() => useLastTransaction());
    act(() => clearLastTransaction());
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx!.request_type).toBe("mixed");
  });

  it("shows cache_hit=true only when ALL logs are cache hits", async () => {
    const logs = [
      makeLog({ id: "log-1", cache_hit: true, api_pricing: null }),
      makeLog({ id: "log-2", cache_hit: true, api_pricing: null }),
    ];
    setupSupabaseChain(logs);

    const { result } = renderHook(() => useLastTransaction());
    act(() => clearLastTransaction());
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx!.cache_hit).toBe(true);
    expect(result.current.lastTx!.cost).toBe(0);
  });

  it("shows cache_hit=false when some but not all are cache hits", async () => {
    const logs = [
      makeLog({ id: "log-1", cache_hit: true, api_pricing: null }),
      makeLog({ id: "log-2", cache_hit: false }),
    ];
    setupSupabaseChain(logs);

    const { result } = renderHook(() => useLastTransaction());
    act(() => clearLastTransaction());
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx!.cache_hit).toBe(false);
  });

  it("sums thinking tokens across multiple calls", async () => {
    const logs = [
      makeLog({ id: "log-1", thinking_tokens: 500 }),
      makeLog({ id: "log-2", thinking_tokens: 300 }),
    ];
    setupSupabaseChain(logs);

    const { result } = renderHook(() => useLastTransaction());
    act(() => clearLastTransaction());
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx!.thinking_tokens).toBe(800);
  });

  it("resets state when cleared again", async () => {
    setupSupabaseChain([makeLog()]);
    const { result } = renderHook(() => useLastTransaction());

    act(() => clearLastTransaction());
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });
    expect(result.current.lastTx).not.toBeNull();

    // Clear again resets to null
    act(() => clearLastTransaction());
    expect(result.current.lastTx).toBeNull();
  });

  it("does not fetch if no clear event has been dispatched", async () => {
    setupSupabaseChain([makeLog()]);
    const { result } = renderHook(() => useLastTransaction());

    // Notify without clearing first — operationStartRef is null
    await act(async () => {
      notifyNewTransaction();
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastTx).toBeNull();
  });
});
