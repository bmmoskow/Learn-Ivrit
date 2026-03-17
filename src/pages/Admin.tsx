import { useState, useEffect, useCallback } from "react";
import { useAdminRole } from "../hooks/useAdminRole";
import { useAuth } from "../contexts/AuthContext/AuthContext";
import { supabase } from "../../supabase/client";
import { DollarSign, Activity, Filter, Zap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

interface PricingInfo {
  prompt_cost_per_million: number;
  candidates_cost_per_million: number;
  thinking_cost_per_million: number;
}

interface UsageLogRaw {
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

interface UsageLog extends UsageLogRaw {
  computed_cost: number;
}

interface UsageSummary {
  totalCalls: number;
  totalCost: number;
  cacheHits: number;
  estimatedSavedCalls: number;
  estimatedSavedCost: number;
  byType: Record<string, { count: number; cost: number }>;
  byUser: Record<string, { count: number; cost: number }>;
}

const REQUEST_TYPES = [
  { value: "", label: "All types" },
  { value: "translate", label: "Translation" },
  { value: "define", label: "Word Definition" },
  { value: "ocr", label: "OCR" },
  { value: "passage_generation", label: "Passage Generation" },
];

const TIME_PERIODS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last year" },
];

function getStartDate(period: string): string {
  const now = new Date();
  const ms: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "365d": 365 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - (ms[period] || ms["7d"])).toISOString();
}

function computeCost(log: UsageLog): number {
  if (log.cache_hit || !log.api_pricing) return 0;
  const p = log.api_pricing;
  return (
    (log.prompt_tokens || 0) * (p.prompt_cost_per_million / 1_000_000) +
    (log.candidates_tokens || 0) * (p.candidates_cost_per_million / 1_000_000) +
    (log.thinking_tokens || 0) * (p.thinking_cost_per_million / 1_000_000)
  );
}

function summarize(logs: UsageLog[]): UsageSummary {
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

  const totalCalls = logs.filter(l => !l.cache_hit).length;
  return { totalCalls, totalCost, cacheHits, estimatedSavedCalls: cacheHits, estimatedSavedCost, byType, byUser };
}

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("api_usage_logs")
      .select("*, api_pricing(prompt_cost_per_million, candidates_cost_per_million, thinking_cost_per_million)")
      .gte("created_at", getStartDate(period))
      .order("created_at", { ascending: false })
      .limit(1000);

    if (typeFilter) {
      query = query.eq("request_type", typeFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching usage logs:", error);
    }
    const rawLogs = (data as unknown as UsageLogRaw[]) || [];
    const enriched: UsageLog[] = rawLogs.map(log => ({
      ...log,
      computed_cost: computeCost(log as UsageLog),
    }));
    setLogs(enriched);
    setLoading(false);
  }, [period, typeFilter]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, fetchLogs]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const summary = summarize(logs);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Usage Dashboard</h1>
          <p className="text-gray-600">Monitor Gemini API calls, costs, and cache efficiency</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {TIME_PERIODS.map((tp) => (
              <option key={tp.value} value={tp.value}>{tp.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {REQUEST_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-blue-600" />
              <span className="text-sm text-gray-500">Total API Calls</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary.totalCalls}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span className="text-sm text-gray-500">Estimated Cost</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${summary.totalCost.toFixed(4)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-orange-600" />
              <span className="text-sm text-gray-500">Avg Cost / Call</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${summary.totalCalls > 0 ? (summary.totalCost / summary.totalCalls).toFixed(6) : "0.00"}
            </p>
          </div>
        </div>

        {/* Cache savings row */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-green-600" />
              <span className="text-sm text-gray-500">Cache Hits (API Calls Saved)</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary.cacheHits}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span className="text-sm text-gray-500">Est. Cost Savings</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${summary.estimatedSavedCost.toFixed(4)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span className="text-sm text-gray-500">Avg Savings / Cache Hit</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${summary.cacheHits > 0 ? (summary.estimatedSavedCost / summary.cacheHits).toFixed(6) : "0.00"}
            </p>
          </div>
        </div>

        {/* Breakdown tables side by side */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">By Request Type</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.byType)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{type}</TableCell>
                      <TableCell className="text-right">{data.count}</TableCell>
                      <TableCell className="text-right">${data.cost.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">By User</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.byUser)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([userId, data]) => (
                    <TableRow key={userId}>
                      <TableCell className="font-mono text-sm">{userId}</TableCell>
                      <TableCell className="text-right">{data.count}</TableCell>
                      <TableCell className="text-right">${data.cost.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent logs table */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Recent Calls {loading && <span className="text-sm text-gray-400">(loading...)</span>}
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>Time</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Model</TableHead>
                   <TableHead>User</TableHead>
                   <TableHead className="text-right">Prompt Tokens</TableHead>
                   <TableHead className="text-right">Candidates Tokens</TableHead>
                   <TableHead className="text-right">Thinking Tokens</TableHead>
                   <TableHead className="text-right">Cost</TableHead>
                   <TableHead>Cache</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 50).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                     <TableCell>{log.request_type}</TableCell>
                     <TableCell className="text-sm">{log.model || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.user_id === "guest-user" ? "Guest" : log.user_id.substring(0, 8)}
                    </TableCell>
                     <TableCell className="text-right">{log.prompt_tokens}</TableCell>
                     <TableCell className="text-right">{log.candidates_tokens}</TableCell>
                    <TableCell className="text-right">{log.thinking_tokens || 0}</TableCell>
                    <TableCell className="text-right">${log.computed_cost.toFixed(6)}</TableCell>
                    <TableCell>
                      {log.cache_hit ? (
                        <span className="text-green-600 font-medium">Hit</span>
                      ) : (
                        <span className="text-gray-400">Miss</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                      No API calls logged for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
