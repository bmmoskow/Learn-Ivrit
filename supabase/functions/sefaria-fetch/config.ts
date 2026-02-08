// Sefaria API configuration
export const SEFARIA_API_BASE_URL = "https://www.sefaria.org/api/texts";

// Cache configuration (in days)
export const CACHE_CONFIG = {
  maxAgeDays: 30,
  staleAfterDays: 7,
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
