import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase/client";

interface PageViewData {
  page: string;
  view_date: string;
  view_count: number;
  total_active_seconds: number;
}

interface ParameterValue {
  value: number | string;
  source: string;
  confidence: string;
}

interface StrategyConfig {
  name: string;
  description: string;
  inputs?: Record<string, string>;
  parameters: Record<string, ParameterValue>;
  formula: string;
}

interface ProgramConfig {
  company?: string;
  official_url?: string;
  cpm?: { value: string; source: string; confidence: string };
  revenue_share?: { value: string; source: string; confidence: string };
  traffic_requirement?: { value: string; source: string; confidence: string };
  policies?: Record<string, { value: string; source: string; confidence: string }>;
  strategies: StrategyConfig[];
}

interface AdServingConfig {
  definitions?: Record<string, unknown>;
  programs: Record<string, ProgramConfig>;
}

export interface StrategyEstimate {
  programKey: string;
  programName: string;
  company?: string;
  officialUrl?: string;
  programCpm?: { value: string; source: string; confidence: string };
  revenueShare?: { value: string; source: string; confidence: string };
  trafficRequirement?: { value: string; source: string; confidence: string };
  strategyName: string;
  strategyDescription: string;
  cpm: number;
  estimatedRevenue: number;
  estimatedImpressions: number;
  estimatedRpm: number;
  formula: string;
  parameters: Record<string, ParameterValue>;
}

export interface EngagementTotals {
  totalViews: number;
  totalActiveSeconds: number;
  totalActiveMinutes: number;
  avgSessionSeconds: number;
}

export interface AdRevenueData {
  engagement: EngagementTotals;
  strategyEstimates: StrategyEstimate[];
  period: string;
}

function getNumericValue(param: ParameterValue | undefined): number {
  if (!param) return 0;
  if (typeof param.value === 'number') return param.value;
  const match = String(param.value).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function calculateRevenue(
  strategy: StrategyConfig,
  pageviews: number,
  activeSeconds: number
): { revenue: number; impressions: number; rpm: number } {
  const params = strategy.parameters;

  const adSlotsPerPage = getNumericValue(params.ad_slots_per_page);
  const fillRate = getNumericValue(params.fill_rate);
  const viewabilityRate = getNumericValue(params.viewability_rate);
  const cpm = getNumericValue(params.cpm) || getNumericValue(params.event_cpm);
  const engagementFactor = getNumericValue(params.engagement_factor) || 1.0;
  const policyComplianceFactor = getNumericValue(params.policy_compliance_factor) || 1.0;
  const refreshIntervalSeconds = getNumericValue(params.refresh_interval_seconds);

  const avgViewableSecondsPerPage = pageviews > 0 ? activeSeconds / pageviews : 0;
  const sessions = pageviews;
  const pagesPerSession = 1;

  let impressions = 0;
  let revenue = 0;

  if (strategy.formula.includes("refresh_interval_seconds") && refreshIntervalSeconds > 0) {
    const eligibleRefreshes = Math.floor(avgViewableSecondsPerPage / refreshIntervalSeconds);
    impressions = Math.floor(
      pageviews * adSlotsPerPage * fillRate * (1 + eligibleRefreshes)
    );
    revenue = (impressions * cpm / 1000) * policyComplianceFactor;
  } else if (strategy.formula.includes("sessions") && strategy.formula.includes("pages_per_session")) {
    impressions = Math.floor(
      sessions * pagesPerSession * adSlotsPerPage * fillRate * viewabilityRate
    );
    revenue = (impressions * cpm / 1000) * engagementFactor;
  } else if (strategy.formula.includes("event_count")) {
    const eventCount = pageviews;
    revenue = (eventCount * cpm / 1000) * policyComplianceFactor;
    impressions = eventCount;
  } else {
    impressions = Math.floor(
      pageviews * adSlotsPerPage * fillRate * viewabilityRate
    );
    revenue = (impressions * cpm / 1000) * engagementFactor * policyComplianceFactor;
  }

  const rpm = pageviews > 0 ? (revenue / pageviews) * 1000 : 0;

  return { revenue, impressions, rpm };
}

export function useAdRevenue() {
  const [data, setData] = useState<AdRevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);

    const daysBack = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const [viewsResult, configResult] = await Promise.all([
      supabase
        .from("page_views_daily")
        .select("page, view_date, view_count, total_active_seconds")
        .gte("view_date", startDate.toISOString().split("T")[0])
        .order("view_date", { ascending: false }),
      supabase
        .from("ad_config")
        .select("config")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (viewsResult.error) {
      console.error("Failed to fetch page views:", viewsResult.error);
      setLoading(false);
      return;
    }
    if (configResult.error) {
      console.error("Failed to fetch ad config:", configResult.error);
      setLoading(false);
      return;
    }

    const pageData = (viewsResult.data as PageViewData[]) || [];
    const config = configResult.data?.config as AdServingConfig | null;

    if (!config?.programs) {
      console.error("No active ad network config found");
      setLoading(false);
      return;
    }

    let totalViews = 0;
    let totalActiveSeconds = 0;
    for (const row of pageData) {
      totalViews += row.view_count;
      totalActiveSeconds += row.total_active_seconds;
    }

    const engagement: EngagementTotals = {
      totalViews,
      totalActiveSeconds,
      totalActiveMinutes: Math.round(totalActiveSeconds / 60),
      avgSessionSeconds: totalViews > 0 ? Math.round(totalActiveSeconds / totalViews) : 0,
    };

    const monthlyPageviews = daysBack > 0 ? Math.round((totalViews / daysBack) * 30) : totalViews;

    const strategyEstimates: StrategyEstimate[] = [];

    for (const [programKey, program] of Object.entries(config.programs)) {
      if (!program.strategies || !Array.isArray(program.strategies)) {
        console.warn(`Skipping program ${programKey}: no strategies defined`);
        continue;
      }

      for (const strategy of program.strategies) {
        if (!strategy.parameters) {
          console.warn(`Skipping strategy ${strategy.name} in ${programKey}: no parameters`);
          continue;
        }

        const { revenue, impressions, rpm } = calculateRevenue(
          strategy,
          totalViews,
          totalActiveSeconds
        );

        const cpm = getNumericValue(strategy.parameters.cpm) || getNumericValue(strategy.parameters.event_cpm);

        strategyEstimates.push({
          programKey,
          programName: programKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          company: program.company,
          officialUrl: program.official_url,
          programCpm: program.cpm,
          revenueShare: program.revenue_share,
          trafficRequirement: program.traffic_requirement,
          strategyName: strategy.name,
          strategyDescription: strategy.description,
          cpm,
          estimatedRevenue: revenue,
          estimatedImpressions: impressions,
          estimatedRpm: rpm,
          formula: strategy.formula,
          parameters: strategy.parameters,
        });
      }
    }

    strategyEstimates.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

    setData({ engagement, strategyEstimates, period });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, period, setPeriod, refetch: fetchData };
}
