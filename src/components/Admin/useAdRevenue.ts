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
  inputs?: Record<string, number | string>;
  cpm: number;
  estimatedRevenue: number;
  estimatedImpressions: number;
  estimatedRpm: number;
  formula: string;
  parameters: Record<string, ParameterValue>;
  error?: string;
  computedSteps?: Array<{equation: string; result: number | string}>;
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

function safeEval(expression: string): number {
  const func = new Function('Math', `"use strict"; return (${expression})`);
  return func(Math);
}

function calculateRevenue(
  strategy: StrategyConfig,
  pageviews: number,
  activeSeconds: number
): { revenue: number; impressions: number; rpm: number; error?: string; computedSteps?: Array<{equation: string; result: number | string}> } {
  const params = strategy.parameters;
  const activeMinutes = activeSeconds / 60;

  const context: Record<string, number> = {
    pageviews,
    active_minutes: activeMinutes,
    active_seconds: activeSeconds,
  };

  for (const [key, param] of Object.entries(params)) {
    context[key] = getNumericValue(param);
  }

  const formulas = strategy.formula.split(';').map(f => f.trim()).filter(f => f.length > 0);
  const computedSteps: Array<{equation: string; result: number | string}> = [];

  try {
    for (const formula of formulas) {
      const [varName, expression] = formula.split('=').map(s => s.trim());

      if (!expression) {
        continue;
      }

      let evalExpression = expression;

      for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evalExpression = evalExpression.replace(regex, String(value));
      }

      evalExpression = evalExpression
        .replace(/floor\(/g, 'Math.floor(')
        .replace(/min\(/g, 'Math.min(')
        .replace(/max\(/g, 'Math.max(');

      const result = safeEval(evalExpression);

      context[varName] = result;
      computedSteps.push({ equation: formula, result });
    }

    const estimatedRevenue = context.estimated_revenue;

    if (estimatedRevenue === undefined || isNaN(estimatedRevenue)) {
      return {
        revenue: 0,
        impressions: 0,
        rpm: 0,
        error: "Missing required data to compute revenue. Formula requires values not available in current dataset.",
        computedSteps
      };
    }

    let impressions = context.estimated_impressions || context.impressions || 0;

    if (impressions === 0 && context.ad_slots_per_page && context.fill_rate) {
      if (context.viewability_rate) {
        impressions = Math.floor(
          pageviews * context.ad_slots_per_page * context.fill_rate * context.viewability_rate
        );
      } else {
        impressions = Math.floor(
          pageviews * context.ad_slots_per_page * context.fill_rate
        );
      }
    }

    const rpm = pageviews > 0 ? (estimatedRevenue / pageviews) * 1000 : 0;

    return { revenue: estimatedRevenue, impressions, rpm, computedSteps };

  } catch (error) {
    return {
      revenue: 0,
      impressions: 0,
      rpm: 0,
      error: `Computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      computedSteps
    };
  }
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

        const { revenue, impressions, rpm, error, computedSteps } = calculateRevenue(
          strategy,
          totalViews,
          totalActiveSeconds
        );

        const cpm = getNumericValue(strategy.parameters.cpm) || getNumericValue(strategy.parameters.event_cpm);

        const actualInputs: Record<string, number | string> = {};

        if (strategy.inputs) {
          const avgViewableSecondsPerPage = totalViews > 0 ? totalActiveSeconds / totalViews : 0;
          const totalActiveMinutes = Math.round(totalActiveSeconds / 60);

          for (const key of Object.keys(strategy.inputs)) {
            switch (key) {
              case 'pageviews':
                actualInputs[key] = totalViews;
                break;
              case 'activeSeconds':
              case 'active_seconds':
                actualInputs[key] = totalActiveSeconds;
                break;
              case 'activeMinutes':
              case 'active_minutes':
                actualInputs[key] = totalActiveMinutes;
                break;
              case 'sessions':
                actualInputs[key] = totalViews;
                break;
              case 'pagesPerSession':
              case 'pages_per_session':
                actualInputs[key] = 1;
                break;
              case 'avgViewableSecondsPerPage':
              case 'avg_viewable_seconds_per_page':
                actualInputs[key] = Math.round(avgViewableSecondsPerPage * 10) / 10;
                break;
              default: {
                const inputValue = strategy.inputs[key];
                if (typeof inputValue === 'number') {
                  actualInputs[key] = inputValue;
                }
                break;
              }
            }
          }
        }

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
          inputs: actualInputs,
          cpm,
          estimatedRevenue: revenue,
          estimatedImpressions: impressions,
          estimatedRpm: rpm,
          formula: strategy.formula,
          parameters: strategy.parameters,
          error,
          computedSteps,
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
