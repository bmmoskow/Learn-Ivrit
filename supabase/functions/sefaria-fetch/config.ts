// Sefaria API configuration
export const SEFARIA_API_BASE_URL = "https://www.sefaria.org/api/texts";

// Cache configuration (in days) - values from Supabase secrets with sensible defaults
export const CACHE_CONFIG = {
  maxAgeDays: parseInt(Deno.env.get("SEFARIA_CACHE_MAX_AGE_DAYS") || "30", 10),
  staleAfterDays: parseInt(Deno.env.get("SEFARIA_CACHE_STALE_AFTER_DAYS") || "7", 10),
};

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export function getSefariaUrl(reference: string): string {
  return `${SEFARIA_API_BASE_URL}/${reference}?context=0`;
}
