import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface DefinitionRequest {
  word: string;
  targetLanguage: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    if (path.includes("/translate")) {
      const { text, sourceLanguage, targetLanguage }: TranslateRequest = await req.json();

      const vowelInstruction = targetLanguage === "Hebrew"
        ? " CRITICAL: Include ALL vowel marks (nikud) in the Hebrew translation. The Hebrew text must have full vocalization with all vowel points (nikud)."
        : "";

      const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}.${vowelInstruction} Provide only the translation, nothing else:\n\n${text}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }],
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${errorText}`);
      }

      const data = await response.json();
      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text || "Translation failed";

      return new Response(
        JSON.stringify({ translation }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (path.includes("/define")) {
      const { word, targetLanguage }: DefinitionRequest = await req.json();

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

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }],
            }],
            generationConfig: {
              temperature: 0.1,
              topK: 20,
              topP: 0.9,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      let wordWithVowels = word;
      let definition = '';
      let transliteration = '';
      let forms = [];

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawResponse) {
          const wordMatch = rawResponse.match(/WORD:\s*([^\n]+)/i);
          const defMatch = rawResponse.match(/DEFINITION:\s*([^\n]+)/i);
          const translitMatch = rawResponse.match(/TRANSLITERATION:\s*([^\n]+)/i);
          const formsMatch = rawResponse.match(/FORMS:\s*([\s\S]+?)(?=\n\n|$)/i);

          wordWithVowels = wordMatch?.[1]?.trim() || word;
          definition = defMatch?.[1]?.trim() || '';
          transliteration = translitMatch?.[1]?.trim() || '';

          if (formsMatch) {
            const formsText = formsMatch[1].trim();

            forms = formsText
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => {
                const match = line.match(/^-\s*([^(]+)\(([^)]+)\)\s*-\s*(.+)$/);
                if (match) {
                  return {
                    hebrew: match[1].trim(),
                    transliteration: match[2].trim(),
                    relationship: match[3].trim()
                  };
                }
                return null;
              })
              .filter(form => form !== null);
          }
        }
      }

      return new Response(
        JSON.stringify({
          wordWithVowels,
          definition,
          examples: [],
          notes: '',
          forms,
          transliteration
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});