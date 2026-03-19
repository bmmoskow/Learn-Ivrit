import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabase/client";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { computeCost, UsageLogRaw } from "./adminUtils";
import { hashUserIdCached } from "../../utils/hashUserId";

export interface LastTransaction {
  request_type: string;
  prompt_tokens: number;
  candidates_tokens: number;
  thinking_tokens: number;
  cache_hit: boolean;
  cost: number;
  created_at: string;
  /** Number of individual API calls accumulated in this summary */
  call_count: number;
}

/** Dispatch this custom event after inserting into api_usage_logs to trigger a refresh. */
export function notifyNewTransaction() {
  window.dispatchEvent(new Event("api-usage-logged"));
}

/** Clear the current footer state when a new transaction starts. */
export function clearLastTransaction() {
  window.dispatchEvent(new Event("api-usage-cleared"));
}

/**
 * Subscribes to the most recent api_usage_log entries (for the current user)
 * since the last clear event, accumulating costs across multiple paragraphs.
 */
export function useLastTransaction() {
  const { user } = useAuth();
  const [lastTx, setLastTx] = useState<LastTransaction | null>(null);
  const operationStartRef = useRef<string | null>(null);

  const fetchSinceStart = useCallback(async () => {
    if (!user || !operationStartRef.current) return;

    const hashedId = await hashUserIdCached(user.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("api_usage_logs")
      .select("*, api_pricing(*)")
      .eq("user_id", hashedId)
      .gte("created_at", operationStartRef.current)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const logs = data as UsageLogRaw[];
      let totalPrompt = 0;
      let totalCandidates = 0;
      let totalThinking = 0;
      let totalCost = 0;
      let anyCacheHit = false;
      let allCacheHits = true;
      const types = new Set<string>();

      for (const raw of logs) {
        totalPrompt += raw.prompt_tokens || 0;
        totalCandidates += raw.candidates_tokens || 0;
        totalThinking += raw.thinking_tokens || 0;
        totalCost += computeCost(raw);
        if (raw.cache_hit) anyCacheHit = true;
        else allCacheHits = false;
        types.add(raw.request_type);
      }

      const typeLabel = types.size === 1 ? [...types][0] : "mixed";

      setLastTx({
        request_type: typeLabel,
        prompt_tokens: totalPrompt,
        candidates_tokens: totalCandidates,
        thinking_tokens: totalThinking,
        cache_hit: allCacheHits && anyCacheHit,
        cost: totalCost,
        created_at: logs[0].created_at,
        call_count: logs.length,
      });
    }
  }, [user]);

  // Listen for custom DOM events
  useEffect(() => {
    const handleLogged = () => {
      fetchSinceStart();

      // Fallback polls in case DB commit is slightly delayed
      const retryDelays = [150, 500, 1200];
      retryDelays.forEach((delay) => {
        window.setTimeout(() => {
          fetchSinceStart();
        }, delay);
      });
    };

    const handleCleared = () => {
      operationStartRef.current = new Date().toISOString();
      setLastTx(null);
    };

    window.addEventListener("api-usage-logged", handleLogged);
    window.addEventListener("api-usage-cleared", handleCleared);

    return () => {
      window.removeEventListener("api-usage-logged", handleLogged);
      window.removeEventListener("api-usage-cleared", handleCleared);
    };
  }, [fetchSinceStart]);

  // Also subscribe to realtime inserts (for edge-function-originated logs)
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    hashUserIdCached(user.id).then((hashedId) => {
      channel = supabase
        .channel("admin-cost-footer")
        .on(
          "postgres_changes" as "system",
          {
            event: "INSERT",
            schema: "public",
            table: "api_usage_logs",
            filter: `user_id=eq.${hashedId}`,
          } as Record<string, string>,
          () => {
            fetchSinceStart();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, fetchSinceStart]);

  return { lastTx };
}
