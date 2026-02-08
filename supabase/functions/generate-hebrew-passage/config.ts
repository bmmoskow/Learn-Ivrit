// Gemini API configuration
export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL_VERSION") || "gemini-2.5-flash";
export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

export const GEMINI_URL = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Rate limiting configuration
export const RATE_LIMITS = {
  passage_generation: {
    hourly: 20,
    daily: 50,
    name: "passage generation",
  },
};
