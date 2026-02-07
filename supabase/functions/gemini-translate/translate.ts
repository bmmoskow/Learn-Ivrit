import { getGeminiUrl } from "./config.ts";
import {
  corsHeaders,
  checkRateLimit,
  logRequest,
  hashText,
  createErrorResponse,
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
  rateLimitId: string,
): Promise<Response> {
  const { text, sourceLanguage, targetLanguage }: TranslateRequest = await req.json();

  const rateLimitCheck = await checkRateLimit(supabase, rateLimitId, "passage_translation");
  if (!rateLimitCheck.allowed) {
    return new Response(JSON.stringify({ error: rateLimitCheck.error }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  // Cache lookup is now done on frontend for faster retrieval
  // Edge function only handles cache misses (actual translation)
  // Include direction in hash for separate caching of each translation direction
  const cacheKey = `${sourceLanguage}->${targetLanguage}:${text}`;
  const contentHash = await hashText(cacheKey);
  const textLength = text.length;
  console.log(`Translating ${sourceLanguage} to ${targetLanguage} - hash:`, contentHash, "length:", textLength);

  await logRequest(supabase, rateLimitId, "passage_translation");

  const vowelInstruction =
    targetLanguage === "Hebrew"
      ? " CRITICAL: Include ALL vowel marks (nikud) in the Hebrew translation. The Hebrew text must have full vocalization with all vowel points (nikud)."
      : "";

  // Detect if text contains verse numbers like (1), (2), etc.
  const hasVerseNumbers = /^\(\d+\)\s/.test(text.trim());

  const lineBreakInstruction = hasVerseNumbers
    ? " CRITICAL: This text contains numbered verses like (1), (2), (3). You MUST preserve each verse number exactly as-is at the start of each translated verse. Keep each verse on its own paragraph separated by double line breaks. Output format: (1) translated verse 1\\n\\n(2) translated verse 2\\n\\n(3) translated verse 3"
    : " CRITICAL: Preserve the exact line breaks and paragraph structure from the original text in your translation. Keep single line breaks as single line breaks and double line breaks as double line breaks.";

  const MAX_CHUNK_LENGTH = 3000;
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const paragraphWithBreak = currentChunk ? "\n\n" + paragraph : paragraph;
    if ((currentChunk + paragraphWithBreak).length > MAX_CHUNK_LENGTH && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += paragraphWithBreak;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Total paragraphs in source: ${paragraphs.length}`);
  chunks.forEach((chunk, i) => {
    const chunkParas = chunk.split(/\n\n+/).length;
    console.log(`Chunk ${i + 1} length: ${chunk.length} chars, paragraphs: ${chunkParas}`);
  });

  const translations: string[] = [];
  const chunkParagraphCounts: number[] = [];

  for (const chunk of chunks) {
    const chunkParaCount = chunk.split(/\n\n+/).length;
    chunkParagraphCounts.push(chunkParaCount);

    const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}.${vowelInstruction}${lineBreakInstruction} Provide only the translation, nothing else:\n\n${chunk}`;

    const response = await fetch(getGeminiUrl(), {
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
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const chunkTranslation = candidate?.content?.parts?.[0]?.text || "";
    const finishReason = candidate?.finishReason;

    const translatedParaCount = chunkTranslation.trim().split(/\n\n+/).length;
    console.log(`Chunk ${translations.length + 1} finish reason:`, finishReason);
    console.log(`Chunk ${translations.length + 1} translation length:`, chunkTranslation.length);
    console.log(
      `Chunk ${translations.length + 1} expected paragraphs: ${chunkParaCount}, got: ${translatedParaCount}`,
    );

    if (finishReason === "MAX_TOKENS") {
      console.warn("Translation was truncated due to MAX_TOKENS");
    }

    if (chunkTranslation) {
      translations.push(chunkTranslation.trim());
    }
  }

  const translation = translations.join("\n\n");
  const finalParaCount = translation.split(/\n\n+/).length;
  console.log(`Final translation paragraphs: ${finalParaCount}, expected: ${paragraphs.length}`);

  const { error: insertError } = await supabase.from("translation_cache").insert({
    content_hash: contentHash,
    hebrew_text: text.substring(0, 5000), // Store source text (could be Hebrew or English)
    translation: translation,
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

  return createJsonResponse({ translation });
}
