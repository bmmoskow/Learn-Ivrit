// Gemini API configuration
export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL_VERSION") || "gemini-2.5-flash";
export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

export const GEMINI_URL = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Rate limiting configuration - values from Supabase secrets with sensible defaults
export const RATE_LIMITS = {
  word_definition: {
    hourly: parseInt(Deno.env.get("WORD_DEFINITION_HOURLY_LIMIT") || "100", 10),
    daily: parseInt(Deno.env.get("WORD_DEFINITION_DAILY_LIMIT") || "500", 10),
    name: "word definition",
  },
  passage_translation: {
    hourly: parseInt(Deno.env.get("PASSAGE_TRANSLATION_HOURLY_LIMIT") || "30", 10),
    daily: parseInt(Deno.env.get("PASSAGE_TRANSLATION_DAILY_LIMIT") || "100", 10),
    name: "passage translation",
  },
};
