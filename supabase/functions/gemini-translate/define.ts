import { GEMINI_URL, THINKING_BUDGET } from "./config.ts";
import {
  corsHeaders,
  checkRateLimit,
  logRequest,
  createJsonResponse,
  SupabaseClient,
} from "./shared.ts";

export interface DefinitionRequest {
  word: string;
  targetLanguage: string;
}

export async function handleDefine(
  req: Request,
  supabase: SupabaseClient,
  rateLimitId: string,
): Promise<Response> {
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

  // Fire log request in parallel with Gemini call (don't block)
  const logPromise = logRequest(supabase, rateLimitId, "word_definition").catch(
    (err: unknown) => console.error("Failed to log request:", err)
  );

  // Check if word starts with common prefixes
  const commonPrefixes = ["ה", "ב", "כ", "ל", "מ", "ש", "ו"];
  const startsWithPrefix = commonPrefixes.some((p) => word.startsWith(p)) && word.length > 2;
  const startsWithLamed = word.startsWith("ל") && word.length > 2;

  let prefixNote = "";
  if (startsWithPrefix) {
    prefixNote = `This word likely has a prefix (ה=the, ב=in/at, כ=like, ל=to/for, מ=from, ש=that, ו=and). Include the prefix meaning in the definition.`;
    if (startsWithLamed) {
      prefixNote += ` If it's an infinitive verb (e.g. לכתוב), translate as "to [verb]". Otherwise show the root word without ל as first related word.`;
    } else {
      prefixNote += ` Show the root word without the prefix as the first related word.`;
    }
  }

  const prompt = `Define the Hebrew word "${word}". Respond in EXACTLY this format:

WORD: [word with full nikud]
DEFINITION: [up to 3 English translations separated by semicolons, most common first]
TRANSLITERATION: [pronunciation]
FORMS:
- [hebrew with nikud] ([transliteration]) - [part of speech: meaning]
- [hebrew with nikud] ([transliteration]) - [part of speech: meaning]
- [hebrew with nikud] ([transliteration]) - [part of speech: meaning]

Rules for FORMS (related words):
- Derive from the same Hebrew root (שורש), using different parts of speech (noun, verb, adjective)
- If input is a conjugated verb: first form MUST be the infinitive; remaining forms should be nouns/adjectives, NOT other conjugations
- Do NOT show plural/possessive forms or the same word with different prefixes
${prefixNote}

Example — שלום:
WORD: שָׁלוֹם
DEFINITION: peace; hello; goodbye
TRANSLITERATION: shalom
FORMS:
- שָׁלֵם (shalem) - adjective: complete, whole
- לְהַשְׁלִים (l'hashlim) - verb: to complete, to make peace
- שְׁלֵמוּת (shlemut) - noun: completeness, wholeness`;

  const geminiResponse = await fetch(GEMINI_URL, {
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
        temperature: 0.1,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: THINKING_BUDGET },
      },
    }),
  });

  let wordWithVowels = word;
  let definition = "";
  let transliteration = "";
  let forms = [];

  if (geminiResponse.ok) {
    const geminiData = await geminiResponse.json();
    console.log("Gemini full response:", JSON.stringify(geminiData).substring(0, 1000));
    const rawResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("Gemini raw response for word definition:", rawResponse?.substring(0, 500));

    if (rawResponse) {
      const wordMatch = rawResponse.match(/WORD:\s*([^\n]+)/i);
      const defMatch = rawResponse.match(/DEFINITION:\s*([^\n]+)/i);
      const translitMatch = rawResponse.match(/TRANSLITERATION:\s*([^\n]+)/i);
      const formsMatch = rawResponse.match(/FORMS:\s*([\s\S]+?)(?=\n\n|$)/i);

      wordWithVowels = wordMatch?.[1]?.trim() || word;
      definition = defMatch?.[1]?.trim() || "";
      transliteration = translitMatch?.[1]?.trim() || "";

      console.log("Parsed definition:", definition);
      console.log("Parsed transliteration:", transliteration);

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
  } else {
    const errorText = await geminiResponse.text();
    console.error("Gemini API error:", geminiResponse.status, errorText);
  }

  // Only cache if we got a valid definition
  const hasValidDefinition = definition && definition.trim() !== "";

  // Build response immediately, fire cache upsert without blocking
  const response = createJsonResponse({
    wordWithVowels,
    definition,
    examples: [],
    notes: "",
    forms,
    transliteration,
  });

  if (hasValidDefinition) {
    const shortEnglish = definition.trim();

    // Fire-and-forget: cache upsert + ensure log is written
    Promise.all([
      supabase.from("word_definitions").upsert(
        {
          word: word,
          word_with_vowels: wordWithVowels,
          definition: definition,
          transliteration: transliteration || "",
          examples: [],
          notes: "",
          forms: forms || [],
          short_english: shortEnglish,
          last_accessed: new Date().toISOString(),
          access_count: 1,
        },
        { onConflict: "word" },
      ).then(() => console.log("Cached word definition for:", word))
       .catch((err: unknown) => console.error("Failed to cache definition:", err)),
      logPromise,
    ]);
  } else {
    console.log("Skipping cache for word with no valid definition:", word);
    // Still ensure log completes
    logPromise;
  }

  return response;
}
