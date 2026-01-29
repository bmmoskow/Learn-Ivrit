import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL_VERSION") || "gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeminiRequest {
  prompt: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

async function callGeminiAPI(request: GeminiRequest): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: request.prompt }
  ];

  if (request.inlineData) {
    parts.push({
      inline_data: {
        mime_type: request.inlineData.mimeType,
        data: request.inlineData.data,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: request.temperature ?? 0.3,
          topK: request.topK ?? 40,
          topP: request.topP ?? 0.95,
          maxOutputTokens: request.maxOutputTokens ?? 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

const RATE_LIMITS = {
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

async function checkRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
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

async function logRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
  userId: string,
  requestType: "word_definition" | "passage_translation",
): Promise<void> {
  await supabase.from("gemini_api_rate_limits").insert({
    user_id: userId,
    request_type: requestType,
  });
}

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface DefinitionRequest {
  word: string;
  targetLanguage: string;
}

interface ExtractUrlRequest {
  url: string;
}

interface ImageOcrRequest {
  imageData: string; // base64 encoded image
}

function extractArticleStructuredData(html: string): { title?: string; description?: string; articleBody?: string } {
  const result: { title?: string; description?: string; articleBody?: string } = {};

  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1]);

      if (jsonData["@type"] === "NewsArticle" || jsonData["@type"] === "Article") {
        if (jsonData.headline && !result.title) {
          result.title = jsonData.headline;
        }
        if (jsonData.description && !result.description) {
          result.description = jsonData.description;
        }
        if (jsonData.articleBody && !result.articleBody) {
          result.articleBody = jsonData.articleBody;
        }
      }
    } catch {
      // Ignore JSON parse errors for structured data extraction
    }
  }

  if (!result.title) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle) result.title = ogTitle[1];
  }

  if (!result.description) {
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDesc) result.description = ogDesc[1];
  }

  return result;
}

function extractTextFromHtml(html: string): string {
  let text = html;

  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
  text = text.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, "");
  text = text.replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, "");
  text = text.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, "");
  text = text.replace(/<aside[^>]*>([\s\S]*?)<\/aside>/gi, "");
  text = text.replace(/<form[^>]*>([\s\S]*?)<\/form>/gi, "");

  text = text.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, "");
  text = text.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "");
  text = text.replace(/<img[^>]*>/gi, "");
  text = text.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, "");

  text = text.replace(
    /<div[^>]*class="[^"]*(?:caption|credit|photo|image|img|media|video|gallery|sidebar|related|comment|ad|advertisement|promo|banner)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    "",
  );
  text = text.replace(/<span[^>]*class="[^"]*(?:caption|credit|photo|image)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, "");
  text = text.replace(/<p[^>]*class="[^"]*(?:caption|credit|photo|image)[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, "");

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");

  text = text.replace(/<[^>]+>/g, "");

  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  text = text.replace(/^[\s\S]*?<body[^>]*>/i, "");
  text = text.replace(/<\/body>[\s\S]*$/i, "");

  const lines = text.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length < 10) return false;
    if (/^(תמונה|צילום|photo|credit|image):/i.test(trimmed)) return false;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false;
    return true;
  });

  text = filteredLines.join("\n");
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for authentication (optional - guests allowed for translation)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader && authHeader !== "Bearer null" && authHeader !== "Bearer undefined") {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
        console.log(`Authenticated request from user: ${userId}`);
      } else {
        console.log("Guest mode access (invalid token)");
      }
    } else {
      console.log("Guest mode access (no auth header)");
    }

    // For guests, use a consistent guest identifier for rate limiting
    const rateLimitId = userId || "guest-user";

    if (path.includes("/translate")) {
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

      const lineBreakInstruction =
        " CRITICAL: Preserve the exact line breaks and paragraph structure from the original text in your translation. Keep single line breaks as single line breaks and double line breaks as double line breaks. If the text contains numbered verses like (1), (2), (3), etc., you MUST keep each verse number at the start of its line and preserve all line breaks between verses. Each numbered verse must remain on its own separate line.";

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

        const chunkTranslation = await callGeminiAPI({ prompt });
        const finishReason = "STOP";

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

      return new Response(JSON.stringify({ translation }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } else if (path.includes("/define")) {
      const { word }: DefinitionRequest = await req.json();

      const rateLimitCheck = await checkRateLimit(supabase, rateLimitId, "word_definition");
      if (!rateLimitCheck.allowed) {
        return new Response(JSON.stringify({ error: rateLimitCheck.error }), {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      await logRequest(supabase, rateLimitId, "word_definition");

      const prompt = `For the Hebrew word "${word}":

1. Add full nikud (vowel points) to the word
2. Provide ONE primary English translation (the most common meaning only)
3. Provide transliteration
4. List 3 related Hebrew word forms WITH full nikud

You MUST respond in this EXACT format:
WORD: [hebrew with vowel points]
DEFINITION: [single most common english meaning]
TRANSLITERATION: [how to pronounce in English]
FORMS:
- [hebrew with vowel points] ([transliteration]) - [relationship description]
- [hebrew with vowel points] ([transliteration]) - [relationship description]
- [hebrew with vowel points] ([transliteration]) - [relationship description]

Example for שלום:
WORD: שָׁלוֹם
DEFINITION: peace
TRANSLITERATION: shalom
FORMS:
- הַשָּׁלוֹם (ha-shalom) - the peace (definite article)
- שְׁלוֹמִי (shlomi) - my peace (possessive)
- בְּשָׁלוֹם (be-shalom) - in peace (prepositional)`;

      const rawResponse = await callGeminiAPI({
        prompt,
        temperature: 0.1,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 800,
      });

      let wordWithVowels = word;
      let definition = "";
      let transliteration = "";
      let forms = [];

      if (rawResponse) {
          const wordMatch = rawResponse.match(/WORD:\s*([^\n]+)/i);
          const defMatch = rawResponse.match(/DEFINITION:\s*([^\n]+)/i);
          const translitMatch = rawResponse.match(/TRANSLITERATION:\s*([^\n]+)/i);
          const formsMatch = rawResponse.match(/FORMS:\s*([\s\S]+?)(?=\n\n|$)/i);

          wordWithVowels = wordMatch?.[1]?.trim() || word;
          definition = defMatch?.[1]?.trim() || "";
          transliteration = translitMatch?.[1]?.trim() || "";

          if (formsMatch) {
            const formsText = formsMatch[1].trim();

            forms = formsText
              .split("\n")
              .filter((line: string) => line.trim().startsWith("-"))
              .map((line: string) => {
                const match = line.match(/^-\s*([^(]+)\(([^)]+)\)\s*-\s*(.+)$/);
                if (match) {
                  return {
                    hebrew: match[1].trim(),
                    transliteration: match[2].trim(),
                    relationship: match[3].trim(),
                  };
                }
                return null;
              })
              .filter((form: unknown) => form !== null);
        }
      }

      // Cache the definition for future use
      const shortEnglish = definition && definition.trim() !== ""
        ? (definition.length > 40 ? definition.substring(0, 40).trim() + "..." : definition.trim())
        : "Translation unavailable";

      await supabase.from("word_definitions").upsert(
        {
          word: word,
          word_with_vowels: wordWithVowels,
          definition: definition || "",
          transliteration: transliteration || "",
          examples: [],
          notes: "",
          forms: forms || [],
          short_english: shortEnglish,
          last_accessed: new Date().toISOString(),
          access_count: 1,
        },
        {
          onConflict: "word",
        }
      );

      console.log("Cached word definition for:", word);

      return new Response(
        JSON.stringify({
          wordWithVowels,
          definition,
          examples: [],
          notes: "",
          forms,
          transliteration,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    } else if (path.includes("/extract-url")) {
      const { url: targetUrl }: ExtractUrlRequest = await req.json();

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const urlToFetch = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
      console.log("Fetching URL:", urlToFetch);

      const response = await fetch(urlToFetch, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "he,en-US;q=0.9,en;q=0.8",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
      }

      const html = await response.text();
      console.log("HTML length:", html.length);

      if (html.length < 100) {
        throw new Error("Received too little content from URL");
      }

      const structuredData = extractArticleStructuredData(html);
      console.log("Structured data found:", structuredData);

      let title = structuredData.title || "";
      let content = "";

      const htmlExtracted = extractTextFromHtml(html);

      if (structuredData.articleBody && structuredData.articleBody.length > htmlExtracted.length * 0.7) {
        const parts = [];
        if (title) parts.push(title);
        if (structuredData.description && !structuredData.articleBody.includes(structuredData.description)) {
          parts.push(structuredData.description);
        }
        parts.push(structuredData.articleBody);
        content = parts.join("\n\n\n\n");
      } else {
        content = htmlExtracted;
      }

      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : "Untitled";
      }

      if (!content || content.length < 50) {
        throw new Error(
          "Failed to extract readable content from URL. The page might not be an article or is blocking extraction.",
        );
      }

      return new Response(
        JSON.stringify({
          title,
          content,
          excerpt: content.substring(0, 200),
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    } else if (path.includes("/ocr")) {
      const { imageData }: ImageOcrRequest = await req.json();

      if (!imageData) {
        return new Response(JSON.stringify({ error: "Image data is required" }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

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

      await logRequest(supabase, rateLimitId, "passage_translation");

      console.log("Processing image for OCR...");

      // Extract base64 data if it includes the data URL prefix
      const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;

      const prompt = `Extract ALL Hebrew text from this image. Include vowel marks (nikud) if present. Return ONLY the extracted Hebrew text, nothing else.`;

      const extractedText = await callGeminiAPI({
        prompt,
        temperature: 0.1,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 4096,
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      });

      console.log("Extracted text length:", extractedText.length);
      console.log("First 200 chars:", extractedText.substring(0, 200));

      if (!extractedText.trim()) {
        return new Response(
          JSON.stringify({ error: "No Hebrew text found in the image. Please try a clearer image." }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({ hebrewText: extractedText.trim() }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    } else {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
