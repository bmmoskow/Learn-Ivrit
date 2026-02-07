// Gemini API configuration
export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL_VERSION") || "gemini-2.5-flash";
export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

export function getGeminiUrl(): string {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
}

// Rate limiting configuration
export const RATE_LIMITS = {
  word_definition: {
    hourly: 100,
    daily: 500,
    name: "word definition",
  },
  passage_translation: {
    hourly: 30,
    daily: 100,
    name: "passage translation",
  },
};
