// Pure helper functions for Admin dashboard - no external dependencies

export interface PricingInfo {
  prompt_cost_per_million: number;
  candidates_cost_per_million: number;
  thinking_cost_per_million: number;
}

export interface UsageLogRaw {
  id: string;
  user_id: string;
  request_type: string;
  endpoint: string;
  prompt_tokens: number;
  candidates_tokens: number;
  thinking_tokens: number;
  cache_hit: boolean;
  created_at: string;
  model: string | null;
  pricing_id: string | null;
  api_pricing: PricingInfo | null;
}

export interface UsageLog extends UsageLogRaw {
  computed_cost: number;
}

export interface UsageSummary {
  totalCalls: number;
  totalCost: number;
  cacheHits: number;
  estimatedSavedCalls: number;
  estimatedSavedCost: number;
  byType: Record<string, { count: number; cost: number }>;
  byUser: Record<string, { count: number; cost: number }>;
}

export const REQUEST_TYPES = [
  { value: "", label: "All types" },
  { value: "translate", label: "Translation" },
  { value: "define", label: "Word Definition" },
  { value: "ocr", label: "OCR" },
  { value: "passage_generation", label: "Passage Generation" },
];

export const TIME_PERIODS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last year" },
];

const PERIOD_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  "365d": 365 * 24 * 60 * 60 * 1000,
};

export function getStartDate(period: string, now: Date = new Date()): string {
  return new Date(now.getTime() - (PERIOD_MS[period] || PERIOD_MS["7d"])).toISOString();
}

export function computeCost(log: UsageLogRaw): number {
  if (log.cache_hit || !log.api_pricing) return 0;
  const p = log.api_pricing;
  return (
    (log.prompt_tokens || 0) * (p.prompt_cost_per_million / 1_000_000) +
    (log.candidates_tokens || 0) * (p.candidates_cost_per_million / 1_000_000) +
    (log.thinking_tokens || 0) * (p.thinking_cost_per_million / 1_000_000)
  );
}

export function enrichLogs(rawLogs: UsageLogRaw[]): UsageLog[] {
  return rawLogs.map((log) => ({
    ...log,
    computed_cost: computeCost(log),
  }));
}

export function summarize(logs: UsageLog[]): UsageSummary {
  const byType: Record<string, { count: number; cost: number }> = {};
  const byUser: Record<string, { count: number; cost: number }> = {};
  let totalCost = 0;
  let cacheHits = 0;
  let estimatedSavedCost = 0;

  const nonCachedByType: Record<string, { totalCost: number; count: number }> = {};

  for (const log of logs) {
    const cost = log.computed_cost;

    if (!log.cache_hit) {
      totalCost += cost;
      if (!nonCachedByType[log.request_type]) nonCachedByType[log.request_type] = { totalCost: 0, count: 0 };
      nonCachedByType[log.request_type].totalCost += cost;
      nonCachedByType[log.request_type].count++;
    } else {
      cacheHits++;
    }

    if (!byType[log.request_type]) byType[log.request_type] = { count: 0, cost: 0 };
    byType[log.request_type].count++;
    byType[log.request_type].cost += cost;

    const userKey = log.user_id === "guest-user" ? "Guest" : log.user_id.substring(0, 8);
    if (!byUser[userKey]) byUser[userKey] = { count: 0, cost: 0 };
    byUser[userKey].count++;
    byUser[userKey].cost += cost;
  }

  for (const log of logs) {
    if (log.cache_hit) {
      const avg = nonCachedByType[log.request_type];
      if (avg && avg.count > 0) {
        estimatedSavedCost += avg.totalCost / avg.count;
      }
    }
  }

  const totalCalls = logs.filter((l) => !l.cache_hit).length;
  return { totalCalls, totalCost, cacheHits, estimatedSavedCalls: cacheHits, estimatedSavedCost, byType, byUser };
}
