import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase/client";

interface PageViewData {
  page: string;
  view_date: string;
  view_count: number;
  total_active_seconds: number;
}

interface StrategyConfig {
  name: string;
  description: string;
  formula: string;
}

interface ProgramConfig {
  company: string;
  official_url: string;
  cpm: {
    value: string;
    source: string;
    confidence: string;
  };
  revenue_share?: {
    value: string;
    source: string;
    confidence: string;
  };
  traffic_requirement: {
    value: string;
    source: string;
    confidence: string;
  };
  strategies: StrategyConfig[];
}

interface AdServingConfig {
  programs: Record<string, ProgramConfig>;
}

export interface StrategyEstimate {
  programKey: string;
  programName: string;
  strategyName: string;
  strategyDescription: string;
  officialUrl: string;
  cpm: number;
  estimatedRevenue: number;
  estimatedImpressions: number;
  estimatedRpm: number;
  meetsRequirements: boolean;
  formula: string;
  cpmSource: string;
  trafficRequirement: string;
  trafficRequirementSource: string;
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

function parseCpm(cpmValue: string): number {
  const match = cpmValue.match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseMinTraffic(trafficValue: string): number {
  const lowerValue = trafficValue.toLowerCase();
  if (lowerValue.includes("no minimum")) return 0;

  const match = lowerValue.match(/([\d,]+)\s*k?\s*(monthly|sessions|pageviews|users)?/i);
  if (!match) return 0;

  const num = parseFloat(match[1].replace(/,/g, ''));
  if (lowerValue.includes('k')) return num * 1000;
  return num;
}

function calculateRevenue(
  strategy: StrategyConfig,
  pageviews: number,
  activeSeconds: number,
  cpm: number
): { revenue: number; impressions: number; rpm: number } {
  const adSlotsPerPage = 3;
  const fillRate = 0.85;
  const viewabilityRate = 0.70;
  const engagementFactor = 1.0;
  const policyComplianceFactor = 1.0;
  const refreshIntervalSeconds = 60;
  const avgViewableSecondsPerPage = pageviews > 0 ? activeSeconds / pageviews : 0;

  let impressions = 0;
  let revenue = 0;

  if (strategy.formula.includes("refresh")) {
    const eligibleRefreshes = Math.floor(avgViewableSecondsPerPage / refreshIntervalSeconds);
    impressions = Math.floor(
      pageviews * fillRate * (1 + eligibleRefreshes)
    );
    revenue = (impressions * cpm / 1000) * policyComplianceFactor;
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
        .from("ad_network_policies")
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
      const cpm = parseCpm(program.cpm.value);
      const minTraffic = parseMinTraffic(program.traffic_requirement.value);

      for (const strategy of program.strategies) {
        const { revenue, impressions, rpm } = calculateRevenue(
          strategy,
          totalViews,
          totalActiveSeconds,
          cpm
        );

        strategyEstimates.push({
          programKey,
          programName: program.company,
          strategyName: strategy.name,
          strategyDescription: strategy.description,
          officialUrl: program.official_url,
          cpm,
          estimatedRevenue: revenue,
          estimatedImpressions: impressions,
          estimatedRpm: rpm,
          meetsRequirements: monthlyPageviews >= minTraffic,
          formula: strategy.formula,
          cpmSource: program.cpm.source,
          trafficRequirement: program.traffic_requirement.value,
          trafficRequirementSource: program.traffic_requirement.source,
        });
      }
    }

    strategyEstimates.sort((a, b) => {
      const aTraffic = parseMinTraffic(a.trafficRequirement);
      const bTraffic = parseMinTraffic(b.trafficRequirement);
      return aTraffic - bTraffic;
    });

    setData({ engagement, strategyEstimates, period });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, period, setPeriod, refetch: fetchData };
}
