import { GEMINI_URL, THINKING_BUDGET } from "./config.ts";
import {
  hashText,
  createJsonResponse,
  SupabaseClient,
} from "./shared.ts";

export interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export async function handleTranslate(
  req: Request,
  supabase: SupabaseClient,
): Promise<Response> {
  const { text, sourceLanguage, targetLanguage }: TranslateRequest = await req.json();

  // Rate limiting is now handled per-article on the frontend side,
  // not per-chunk here. This endpoint just translates.

  const cacheKey = `${sourceLanguage}->${targetLanguage}:${text}`;
  const contentHash = await hashText(cacheKey);
  const textLength = text.length;
  console.log(
    `Translating ${sourceLanguage} to ${targetLanguage} - hash:`,
    contentHash,
    "length:",
    textLength,
  );

  const vowelInstruction =
    targetLanguage === "Hebrew"
      ? " CRITICAL: Include ALL vowel marks (nikud) in the Hebrew translation. The Hebrew text must have full vocalization with all vowel points (nikud)."
      : "";

  const hasVerseNumbers = /^\(\d+\)\s/.test(text.trim());

  const lineBreakInstruction = hasVerseNumbers
    ? " CRITICAL: This text contains numbered verses like (1), (2), (3). You MUST preserve each verse number exactly as-is at the start of each translated verse. Keep each verse on its own paragraph separated by double line breaks. Output format: (1) translated verse 1\\n\\n(2) translated verse 2\\n\\n(3) translated verse 3"
    : " CRITICAL: Preserve the exact line breaks and paragraph structure from the original text in your translation. Keep single line breaks as single line breaks and double line breaks as double line breaks.";

  const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}.${vowelInstruction}${lineBreakInstruction} Provide only the translation, nothing else:\n\n${text}`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: THINKING_BUDGET },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const translation = candidate?.content?.parts?.[0]?.text || "";
  const finishReason = candidate?.finishReason;

  console.log(`Translation finish reason:`, finishReason);
  console.log(`Translation length:`, translation.length);

  if (finishReason === "MAX_TOKENS") {
    console.warn("Translation was truncated due to MAX_TOKENS");
  }

  await cacheTranslation(supabase, contentHash, text, translation, textLength);

  return createJsonResponse({ translation });
}

async function cacheTranslation(
  supabase: SupabaseClient,
  contentHash: string,
  text: string,
  translation: string,
  textLength: number,
): Promise<void> {
  const { error: insertError } = await supabase.from("translation_cache").insert({
    content_hash: contentHash,
    hebrew_text: text.substring(0, 5000),
    translation,
    text_length: textLength,
    cached_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
    access_count: 0,
  });

  if (insertError) {
    console.error("Failed to cache translation:", insertError);
  } else {
    console.log("✓ Cached translation with hash:", contentHash);
  }
}
