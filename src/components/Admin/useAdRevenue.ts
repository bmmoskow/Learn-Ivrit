import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase/client";

interface PageViewData {
  page: string;
  view_date: string;
  view_count: number;
  total_active_seconds: number;
}

interface AdNetworkPolicy {
  id: string;
  network_name: string;
  tier_name: string;
  display_cpm: number;
  video_cpm: number;
  display_fill_rate: number;
  video_fill_rate: number;
  refresh_interval_seconds: number;
  revenue_share_percent: number;
  min_monthly_pageviews: number;
  min_requirements_notes: string | null;
  source_url: string | null;
  cpm_source_url: string | null;
}

export interface NetworkRevenueEstimate {
  policy: AdNetworkPolicy;
  displayImpressions: number;
  videoImpressions: number;
  grossDisplayRevenue: number;
  grossVideoRevenue: number;
  netDisplayRevenue: number;
  netVideoRevenue: number;
  netTotalRevenue: number;
  meetsMinimum: boolean;
}

export interface EngagementTotals {
  totalViews: number;
  totalActiveSeconds: number;
  totalActiveMinutes: number;
  avgSessionSeconds: number;
}

export interface AdRevenueData {
  engagement: EngagementTotals;
  networkEstimates: NetworkRevenueEstimate[];
  period: string;
}

function estimateImpressions(activeSeconds: number, refreshInterval: number, fillRate: number): number {
  const rawImpressions = Math.floor(activeSeconds / refreshInterval);
  return Math.floor(rawImpressions * fillRate);
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

    // Fetch page views and policies in parallel
    const [viewsResult, policiesResult] = await Promise.all([
      supabase
        .from("page_views_daily")
        .select("page, view_date, view_count, total_active_seconds")
        .gte("view_date", startDate.toISOString().split("T")[0])
        .order("view_date", { ascending: false }),
      supabase
        .from("ad_network_policies")
        .select("*")
        .order("network_name, tier_name"),
    ]);

    if (viewsResult.error) {
      console.error("Failed to fetch page views:", viewsResult.error);
      setLoading(false);
      return;
    }
    if (policiesResult.error) {
      console.error("Failed to fetch ad policies:", policiesResult.error);
      setLoading(false);
      return;
    }

    const pageData = (viewsResult.data as PageViewData[]) || [];
    const policies = (policiesResult.data as AdNetworkPolicy[]) || [];

    // Aggregate engagement totals
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

    // Scale pageviews to monthly estimate for minimum comparison
    const monthlyPageviews = daysBack > 0 ? Math.round((totalViews / daysBack) * 30) : totalViews;

    // Calculate revenue per network policy
    const networkEstimates: NetworkRevenueEstimate[] = policies.map((policy) => {
      const displayImpressions = estimateImpressions(
        totalActiveSeconds,
        policy.refresh_interval_seconds,
        policy.display_fill_rate
      );
      const videoImpressions = estimateImpressions(
        totalActiveSeconds,
        policy.refresh_interval_seconds,
        policy.video_fill_rate
      );

      const grossDisplayRevenue = (displayImpressions / 1000) * policy.display_cpm;
      const grossVideoRevenue = (videoImpressions / 1000) * policy.video_cpm;
      const shareMultiplier = policy.revenue_share_percent / 100;

      return {
        policy,
        displayImpressions,
        videoImpressions,
        grossDisplayRevenue,
        grossVideoRevenue,
        netDisplayRevenue: grossDisplayRevenue * shareMultiplier,
        netVideoRevenue: grossVideoRevenue * shareMultiplier,
        netTotalRevenue: (grossDisplayRevenue + grossVideoRevenue) * shareMultiplier,
        meetsMinimum: monthlyPageviews >= policy.min_monthly_pageviews,
      };
    });

    // Sort by minimum pageviews ascending (least to greatest)
    networkEstimates.sort((a, b) => a.policy.min_monthly_pageviews - b.policy.min_monthly_pageviews);

    setData({ engagement, networkEstimates, period });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, period, setPeriod, refetch: fetchData };
}
