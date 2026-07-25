// Gemini API configuration (shared across edge functions)
export { GEMINI_MODEL, GEMINI_API_BASE_URL, GEMINI_API_KEY, GEMINI_URL } from "../_shared/gemini.ts";

// Rate limiting configuration - values from Supabase secrets with sensible defaults
export const RATE_LIMITS = {
  passage_generation: {
    hourly: parseInt(Deno.env.get("PASSAGE_GENERATION_HOURLY_LIMIT") || "20", 10),
    daily: parseInt(Deno.env.get("PASSAGE_GENERATION_DAILY_LIMIT") || "50", 10),
    name: "passage generation",
  },
};
