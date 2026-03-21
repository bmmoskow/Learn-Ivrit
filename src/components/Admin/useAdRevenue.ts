import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase/client";

interface PageViewData {
  page: string;
  view_date: string;
  view_count: number;
  total_active_seconds: number;
}

interface AdNetworkPolicy {
  network_name: string;
  tier_name: string;
  strategy_name: string;
  strategy_description: string | null;
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
  ad_slots_per_page: number;
  viewability_rate: number;
  engagement_factor: number;
  policy_compliance_factor: number;
}

interface AdNetworkPolicyConfig {
  id: string;
  config: {
    policies: AdNetworkPolicy[];
  };
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  estimatedRPM: number;
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

function estimateImpressions(
  pageViews: number,
  adSlotsPerPage: number,
  fillRate: number,
  viewabilityRate: number,
  engagementFactor: number,
  policyComplianceFactor: number
): number {
  const baseImpressions = pageViews * adSlotsPerPage;
  const viewableImpressions = baseImpressions * fillRate * viewabilityRate;
  return Math.floor(viewableImpressions * engagementFactor * policyComplianceFactor);
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

    // Fetch page views and active policy config in parallel
    const [viewsResult, policiesResult] = await Promise.all([
      supabase
        .from("page_views_daily")
        .select("page, view_date, view_count, total_active_seconds")
        .gte("view_date", startDate.toISOString().split("T")[0])
        .order("view_date", { ascending: false }),
      supabase
        .from("ad_network_policies")
        .select("*")
        .eq("is_active", true)
        .maybeSingle(),
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
    const policyConfig = policiesResult.data as AdNetworkPolicyConfig | null;
    const policies = policyConfig?.config?.policies || [];

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
        totalViews,
        policy.ad_slots_per_page,
        policy.display_fill_rate,
        policy.viewability_rate,
        policy.engagement_factor,
        policy.policy_compliance_factor
      );
      const videoImpressions = estimateImpressions(
        totalViews,
        policy.ad_slots_per_page,
        policy.video_fill_rate,
        policy.viewability_rate,
        policy.engagement_factor,
        policy.policy_compliance_factor
      );

      const grossDisplayRevenue = (displayImpressions / 1000) * policy.display_cpm;
      const grossVideoRevenue = (videoImpressions / 1000) * policy.video_cpm;
      const shareMultiplier = policy.revenue_share_percent / 100;
      const netTotalRevenue = (grossDisplayRevenue + grossVideoRevenue) * shareMultiplier;
      const estimatedRPM = totalViews > 0 ? (netTotalRevenue / totalViews) * 1000 : 0;

      return {
        policy,
        displayImpressions,
        videoImpressions,
        grossDisplayRevenue,
        grossVideoRevenue,
        netDisplayRevenue: grossDisplayRevenue * shareMultiplier,
        netVideoRevenue: grossVideoRevenue * shareMultiplier,
        netTotalRevenue,
        estimatedRPM,
        meetsMinimum: monthlyPageviews >= policy.min_monthly_pageviews,
      };
    });

    // Sort by network name, then tier, then by revenue descending
    networkEstimates.sort((a, b) => {
      if (a.policy.network_name !== b.policy.network_name) {
        return a.policy.network_name.localeCompare(b.policy.network_name);
      }
      if (a.policy.tier_name !== b.policy.tier_name) {
        return a.policy.tier_name.localeCompare(b.policy.tier_name);
      }
      return b.netTotalRevenue - a.netTotalRevenue;
    });

    setData({ engagement, networkEstimates, period });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, period, setPeriod, refetch: fetchData };
}
