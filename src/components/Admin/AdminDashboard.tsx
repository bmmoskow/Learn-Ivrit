import { useEffect } from "react";
import { DollarSign, Activity, Filter, Zap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useAdmin } from "./useAdmin";
import { summarize, REQUEST_TYPES, TIME_PERIODS } from "./adminUtils";

export function AdminDashboard() {
  const { logs, loading, period, typeFilter, setPeriod, setTypeFilter, fetchLogs } = useAdmin();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
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
