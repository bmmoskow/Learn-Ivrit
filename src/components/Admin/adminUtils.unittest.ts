import { describe, it, expect } from "vitest";
import {
  getStartDate,
  computeCost,
  enrichLogs,
  summarize,
  REQUEST_TYPES,
  TIME_PERIODS,
  type UsageLogRaw,
  type UsageLog,
} from "./adminUtils";

const PRICING = {
  prompt_cost_per_million: 1.25,
  candidates_cost_per_million: 5.0,
  thinking_cost_per_million: 10.0,
};

const makeRawLog = (overrides: Partial<UsageLogRaw> = {}): UsageLogRaw => ({
  id: "log-1",
  user_id: "user-abc-123",
  request_type: "translate",
  endpoint: "/translate",
  prompt_tokens: 100,
  candidates_tokens: 200,
  thinking_tokens: 0,
  cache_hit: false,
  created_at: "2024-06-15T10:00:00Z",
  model: "gemini-2.5-flash",
  pricing_id: "pricing-1",
  api_pricing: PRICING,
  ...overrides,
});

const makeLog = (overrides: Partial<UsageLog> = {}): UsageLog => {
  const raw = makeRawLog(overrides);
  return { ...raw, computed_cost: computeCost(raw), ...overrides };
};

describe("getStartDate", () => {
  const now = new Date("2024-06-15T12:00:00Z");

  it("returns 24h ago for '24h'", () => {
    const result = new Date(getStartDate("24h", now));
    expect(result.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000);
  });

  it("returns 7d ago for '7d'", () => {
    const result = new Date(getStartDate("7d", now));
    expect(result.getTime()).toBe(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  });

  it("defaults to 7d for unknown period", () => {
    const result = new Date(getStartDate("unknown", now));
    expect(result.getTime()).toBe(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  });
});

describe("computeCost", () => {
  it("returns 0 for cache hit", () => {
    expect(computeCost(makeRawLog({ cache_hit: true }))).toBe(0);
  });

  it("returns 0 when no pricing info", () => {
    expect(computeCost(makeRawLog({ api_pricing: null }))).toBe(0);
  });

  it("computes cost correctly", () => {
    const log = makeRawLog({
      prompt_tokens: 1_000_000,
      candidates_tokens: 1_000_000,
      thinking_tokens: 1_000_000,
    });
    // 1.25 + 5.0 + 10.0 = 16.25
    expect(computeCost(log)).toBeCloseTo(16.25);
  });

  it("handles zero tokens", () => {
    const log = makeRawLog({
      prompt_tokens: 0,
      candidates_tokens: 0,
      thinking_tokens: 0,
    });
    expect(computeCost(log)).toBe(0);
  });

  it("computes partial tokens correctly", () => {
    const log = makeRawLog({
      prompt_tokens: 100,
      candidates_tokens: 200,
      thinking_tokens: 0,
    });
    // 100 * 1.25/1M + 200 * 5.0/1M = 0.000125 + 0.001 = 0.001125
    expect(computeCost(log)).toBeCloseTo(0.001125);
  });
});

describe("enrichLogs", () => {
  it("adds computed_cost to each log", () => {
    const raw = [makeRawLog(), makeRawLog({ id: "log-2", cache_hit: true })];
    const enriched = enrichLogs(raw);
    expect(enriched).toHaveLength(2);
    expect(enriched[0].computed_cost).toBeGreaterThan(0);
    expect(enriched[1].computed_cost).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(enrichLogs([])).toEqual([]);
  });
});

describe("summarize", () => {
  it("returns zeroed summary for empty logs", () => {
    const result = summarize([]);
    expect(result.totalCalls).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.cacheHits).toBe(0);
    expect(result.estimatedSavedCost).toBe(0);
  });

  it("excludes cache hits from totalCalls", () => {
    const logs: UsageLog[] = [
      makeLog({ id: "1", cache_hit: false }),
      makeLog({ id: "2", cache_hit: true, computed_cost: 0 }),
      makeLog({ id: "3", cache_hit: false }),
    ];
    const result = summarize(logs);
    expect(result.totalCalls).toBe(2);
    expect(result.cacheHits).toBe(1);
  });

  it("groups by request type", () => {
    const logs: UsageLog[] = [
      makeLog({ id: "1", request_type: "translate" }),
      makeLog({ id: "2", request_type: "translate" }),
      makeLog({ id: "3", request_type: "define" }),
    ];
    const result = summarize(logs);
    expect(result.byType["translate"].count).toBe(2);
    expect(result.byType["define"].count).toBe(1);
  });

  it("groups by user, shortening IDs", () => {
    const logs: UsageLog[] = [
      makeLog({ id: "1", user_id: "abcdefgh-1234" }),
      makeLog({ id: "2", user_id: "guest-user" }),
    ];
    const result = summarize(logs);
    expect(result.byUser["abcdefgh"]).toBeDefined();
    expect(result.byUser["Guest"]).toBeDefined();
  });

  it("estimates saved cost from cache hits", () => {
    const logs: UsageLog[] = [
      makeLog({ id: "1", request_type: "translate", cache_hit: false, computed_cost: 0.01 }),
      makeLog({ id: "2", request_type: "translate", cache_hit: true, computed_cost: 0 }),
    ];
    const result = summarize(logs);
    expect(result.estimatedSavedCost).toBeCloseTo(0.01);
  });
});

describe("constants", () => {
  it("REQUEST_TYPES includes 'All types' option", () => {
    expect(REQUEST_TYPES[0]).toEqual({ value: "", label: "All types" });
    expect(REQUEST_TYPES.length).toBeGreaterThan(1);
  });

  it("TIME_PERIODS includes expected periods", () => {
    const values = TIME_PERIODS.map((tp) => tp.value);
    expect(values).toContain("24h");
    expect(values).toContain("7d");
    expect(values).toContain("30d");
  });
});
