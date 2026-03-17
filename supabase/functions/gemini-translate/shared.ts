import { createClient } from "npm:@supabase/supabase-js@2";
import { RATE_LIMITS } from "./config.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  // Must include all headers the browser may send
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClient = ReturnType<typeof createClient<any>>;

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  requestType: "word_definition" | "passage_translation",
): Promise<{ allowed: boolean; error?: string }> {
  const limits = RATE_LIMITS[requestType];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: hourlyRequests, error: hourlyError } = await supabase
    .from("gemini_api_rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("request_type", requestType)
    .gte("created_at", oneHourAgo.toISOString())
    .order("created_at", { ascending: true });

  if (hourlyError) {
    console.error("Error checking hourly rate limit:", hourlyError);
    return { allowed: true };
  }

  if ((hourlyRequests?.length || 0) >= limits.hourly) {
    const oldestRequest = new Date(hourlyRequests[0].created_at);
    const resetTime = new Date(oldestRequest.getTime() + 60 * 60 * 1000);
    const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 1000));

    return {
      allowed: false,
      error: `Rate limit exceeded for ${limits.name} translations. You can make ${limits.hourly} requests per hour. Try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""}.`,
    };
  }

  const { data: dailyRequests, error: dailyError } = await supabase
    .from("gemini_api_rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("request_type", requestType)
    .gte("created_at", oneDayAgo.toISOString())
    .order("created_at", { ascending: true });

  if (dailyError) {
    console.error("Error checking daily rate limit:", dailyError);
    return { allowed: true };
  }

  if ((dailyRequests?.length || 0) >= limits.daily) {
    const oldestRequest = new Date(dailyRequests[0].created_at);
    const resetTime = new Date(oldestRequest.getTime() + 24 * 60 * 60 * 1000);
    const hoursUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 60 * 1000));

    return {
      allowed: false,
      error: `Daily rate limit exceeded for ${limits.name} translations. You can make ${limits.daily} requests per day. Try again in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? "s" : ""}.`,
    };
  }

  return { allowed: true };
}

export async function logRequest(
  supabase: SupabaseClient,
  userId: string,
  requestType: "word_definition" | "passage_translation",
): Promise<void> {
  await supabase.from("gemini_api_rate_limits").insert({
    user_id: userId,
    request_type: requestType,
  });
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

export function extractUsageMetadata(geminiData: Record<string, unknown>): GeminiUsageMetadata {
  const usage = (geminiData?.usageMetadata || {}) as GeminiUsageMetadata;
  return {
    promptTokenCount: usage.promptTokenCount || 0,
    candidatesTokenCount: usage.candidatesTokenCount || 0,
    thoughtsTokenCount: usage.thoughtsTokenCount || 0,
    totalTokenCount: usage.totalTokenCount || 0,
  };
}

export interface PricingRecord {
  id: string;
  model: string;
  prompt_cost_per_million: number;
  candidates_cost_per_million: number;
  thinking_cost_per_million: number;
}

export async function getCurrentPricing(
  supabase: SupabaseClient,
  model: string,
): Promise<PricingRecord | null> {
  const { data, error } = await supabase
    .from("api_pricing")
    .select("id, model, prompt_cost_per_million, candidates_cost_per_million, thinking_cost_per_million")
    .eq("model", model)
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Failed to fetch pricing for model", model, error);
    return null;
  }
  return data as PricingRecord;
}

export async function logApiUsage(
  supabase: SupabaseClient,
  userId: string,
  requestType: string,
  endpoint: string,
  usage: GeminiUsageMetadata,
  model: string,
  cacheHit: boolean = false,
): Promise<void> {
  const pricing = await getCurrentPricing(supabase, model);

  const promptTokens = usage.promptTokenCount || 0;
  const candidatesTokens = cacheHit ? 0 : (usage.candidatesTokenCount || 0);
  const thinkingTokens = cacheHit ? 0 : (usage.thoughtsTokenCount || 0);

  try {
    await supabase.from("api_usage_logs").insert({
      user_id: userId,
      request_type: requestType,
      endpoint: endpoint,
      prompt_tokens: promptTokens,
      candidates_tokens: candidatesTokens,
      thinking_tokens: thinkingTokens,
      cache_hit: cacheHit,
      model: model,
      pricing_id: pricing?.id || null,
    });
  } catch (err) {
    console.error("Failed to log API usage:", err);
  }
}

export async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
