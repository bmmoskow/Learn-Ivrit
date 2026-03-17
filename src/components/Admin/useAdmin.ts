import { useState, useCallback } from "react";
import { supabase } from "../../../supabase/client";
import { enrichLogs, getStartDate, type UsageLog, type UsageLogRaw } from "./adminUtils";

export interface UseAdminReturn {
  logs: UsageLog[];
  loading: boolean;
  period: string;
  typeFilter: string;
  setPeriod: (period: string) => void;
  setTypeFilter: (filter: string) => void;
  fetchLogs: () => Promise<void>;
}

export function useAdmin(): UseAdminReturn {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    setLogs(enrichLogs(rawLogs));
    setLoading(false);
  }, [period, typeFilter]);

  return { logs, loading, period, typeFilter, setPeriod, setTypeFilter, fetchLogs };
}
