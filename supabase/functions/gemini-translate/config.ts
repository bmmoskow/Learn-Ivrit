// Gemini API configuration (shared across edge functions)
export { GEMINI_MODEL, GEMINI_API_BASE_URL, GEMINI_API_KEY, GEMINI_URL } from "../_shared/gemini.ts";

// Thinking budget: 0 disables internal reasoning tokens (faster, cheaper, no quality loss for translation)
export const THINKING_BUDGET = parseInt(Deno.env.get("GEMINI_THINKING_BUDGET") || "0", 10);

// URL extraction configuration
export const PAYWALL_MARKERS = [
  "מנויים",
  "לקריאת הכתבה המלאה",
  "התחברו כמנויים",
  "הירשמו לקריאה",
];

// Subset used for pre-extraction paywall detection (before Readability runs).
// These phrases are unambiguous — they never appear in free articles.
// "מנויים" is excluded because it can appear in free-article context.
export const DEFINITIVE_PAYWALL_MARKERS = [
  "לקריאת הכתבה המלאה",
  "התחברו כמנויים",
  "הירשמו לקריאה",
  "מוגבלת למנויים",
  "מוגבל למנויים",
];

export const ARTICLE_TYPES = [
  "NewsArticle",
  "Article",
  "WebPage",
  "ReportageNewsArticle",
  "BlogPosting",
  "TechArticle",
  "GovernmentService",
  "AboutPage",
];

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