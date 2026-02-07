import { getGeminiUrl } from "./config.ts";
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

  await logRequest(supabase, rateLimitId, "word_definition");

  // Check if word starts with common prefixes
  const commonPrefixes = ["ה", "ב", "כ", "ל", "מ", "ש", "ו"];
  const startsWithPrefix = commonPrefixes.some((p) => word.startsWith(p)) && word.length > 2;
  const startsWithLamed = word.startsWith("ל") && word.length > 2;

  const prefixInstructions = startsWithPrefix
    ? `
CRITICAL PREFIX HANDLING:
- This word appears to start with a prefix letter (ה, ב, כ, ל, מ, ש, or ו)
- The definition MUST reflect the prefix meaning:
  * ה (ha-) = "the" (definite article) → "the book" not "book"
  * ב (b'-) = "in/at" → "in the house" not "house"
  * כ (k'-) = "like/as" → "like a king" not "king"
  * ל (l'-) = "to/for" → "to the city" not "city" (BUT if it's an infinitive verb like לכתוב, translate as "to write")
  * מ (m'-) = "from" → "from the place" not "place"
  * ש (sh'-) = "that/which" → include "that" in translation
  * ו (v'-) = "and" → include "and" in translation
${
  startsWithLamed
    ? `
- IMPORTANT: First determine if this ל word is an INFINITIVE VERB (like לכתוב, לראות, לשמוע)
- If it IS an infinitive: translate as "to [verb]" and do NOT show the word without ל as a related word
- If it is NOT an infinitive (like לבית meaning "to the house"): show the root word without ל as the first related word`
    : `- Show the ROOT WORD without the prefix as the FIRST related word`
}
`
    : "";

  // Instruction for conjugated verbs to include infinitive form
  const conjugatedVerbInstruction = `
CONJUGATED VERB HANDLING:
- If this word is a CONJUGATED VERB (any tense, person, gender, number - like הגביל "he limited", כתבתי "I wrote", יראו "they will see"):
  * The definition should describe this specific form (e.g., "he limited", "I wrote", "they will see")
  * The FIRST related word MUST be the INFINITIVE form (e.g., להגביל "to limit", לכתוב "to write", לראות "to see")
  * The remaining related words should be NOUNS or ADJECTIVES from the same root - NOT other verb conjugations
  * DO NOT show other tenses or persons of the same verb (e.g., don't show כתב, כתבה, יכתוב alongside לכתוב)
- Recognize Hebrew verb patterns (binyanim): Pa'al, Nif'al, Pi'el, Pu'al, Hif'il, Huf'al, Hitpa'el
`;

  const prompt = `For the Hebrew word "${word}":

1. Add full nikud (vowel points) to the word
2. Provide up to 3 English translations separated by semicolons (most common first), e.g., "peace; hello; goodbye"
3. Provide transliteration
4. List 3 related Hebrew words
${prefixInstructions}${conjugatedVerbInstruction}
IMPORTANT for related words:
${
  startsWithPrefix && !startsWithLamed
    ? `- FIRST, show the word WITHOUT the prefix as the first related word
- Then show 2 more words from the same Hebrew root (שורש) as different parts of speech`
    : startsWithLamed
      ? `- If this is an infinitive verb, show 3 related words from the same root (שורש) as different parts of speech
- If this is NOT an infinitive (has ל prefix meaning "to/for"), FIRST show the word without ל, then 2 more root-related words`
      : `- If this is a CONJUGATED VERB, the FIRST related word MUST be the INFINITIVE form
- Show words from the same Hebrew root (שורש) as different parts of speech (verb, noun, adjective, adverb)
- If the word is a noun, show the related verb infinitive
- If the word is a verb, show related nouns or adjectives`
}
- DO NOT just add other prefixes (ה, ב, ל, כ, מ, ש, ו) or suffixes to the same word
- DO NOT show plural forms or possessive forms of the same word

You MUST respond in this EXACT format:
WORD: [hebrew with vowel points]
DEFINITION: [up to 3 english translations separated by semicolons - include prefix meaning like "the", "in", "to", "from", etc.]
TRANSLITERATION: [how to pronounce in English]
FORMS:
- [hebrew with vowel points] ([transliteration]) - [part of speech and meaning]
- [hebrew with vowel points] ([transliteration]) - [part of speech and meaning]
- [hebrew with vowel points] ([transliteration]) - [part of speech and meaning]

${
  startsWithPrefix
    ? `Example for הספר (the book):
WORD: הַסֵּפֶר
DEFINITION: the book
TRANSLITERATION: hasefer
FORMS:
- סֵפֶר (sefer) - noun: book (without definite article)
- לִסְפֹּר (lispor) - verb: to count
- סוֹפֵר (sofer) - noun: writer, scribe

Example for בבית (in the house):
WORD: בַּבַּיִת
DEFINITION: in the house
TRANSLITERATION: babayit
FORMS:
- בַּיִת (bayit) - noun: house (without prefix)
- בֵּיתִי (beiti) - adjective: domestic, homely
- לְהָבִית (l'havit) - verb: to house, to shelter

Example for לכתוב (infinitive - to write):
WORD: לִכְתֹּב
DEFINITION: to write
TRANSLITERATION: likhtov
FORMS:
- כָּתַב (katav) - verb past: he wrote
- כְּתִיבָה (ktiva) - noun: writing
- מִכְתָּב (mikhtav) - noun: letter`
    : `Example for הגביל (conjugated verb - he limited):
WORD: הִגְבִּיל
DEFINITION: he limited; he restricted
TRANSLITERATION: higbil
FORMS:
- לְהַגְבִּיל (l'hagbil) - verb infinitive: to limit
- גְּבוּל (gvul) - noun: border, limit
- מֻגְבָּל (mugbal) - adjective: limited

Example for שלום (root: ש-ל-מ):
WORD: שָׁלוֹם
DEFINITION: peace; hello; goodbye
TRANSLITERATION: shalom
FORMS:
- שָׁלֵם (shalem) - adjective: complete, whole
- לְהַשְׁלִים (l'hashlim) - verb: to complete, to make peace
- שְׁלֵמוּת (shlemut) - noun: completeness, wholeness`
}`;

  const geminiResponse = await fetch(getGeminiUrl(), {
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

  if (hasValidDefinition) {
    // Keep the full semicolon-delimited translation list; the UI handles wrapping.
    const shortEnglish = definition.trim();

    await supabase.from("word_definitions").upsert(
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
      {
        onConflict: "word",
      },
    );

    console.log("Cached word definition for:", word);
  } else {
    console.log("Skipping cache for word with no valid definition:", word);
  }

  return createJsonResponse({
    wordWithVowels,
    definition,
    examples: [],
    notes: "",
    forms,
    transliteration,
  });
}
