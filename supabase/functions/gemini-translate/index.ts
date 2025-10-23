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

interface ExtractUrlRequest {
  url: string;
}

function extractArticleStructuredData(html: string): { title?: string; description?: string; articleBody?: string } {
  const result: { title?: string; description?: string; articleBody?: string } = {};

  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1]);

      if (jsonData['@type'] === 'NewsArticle' || jsonData['@type'] === 'Article') {
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
    } catch (e) {
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

  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '');
  text = text.replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '');
  text = text.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '');
  text = text.replace(/<aside[^>]*>([\s\S]*?)<\/aside>/gi, '');
  text = text.replace(/<form[^>]*>([\s\S]*?)<\/form>/gi, '');

  text = text.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, '');
  text = text.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, '');
  text = text.replace(/<img[^>]*>/gi, '');
  text = text.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, '');

  text = text.replace(/<div[^>]*class="[^"]*(?:caption|credit|photo|image|img|media|video|gallery|sidebar|related|comment|ad|advertisement|promo|banner)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '');
  text = text.replace(/<span[^>]*class="[^"]*(?:caption|credit|photo|image)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '');
  text = text.replace(/<p[^>]*class="[^"]*(?:caption|credit|photo|image)[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, '');

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  text = text.replace(/<[^>]+>/g, '');

  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  text = text.replace(/^[\s\S]*?<body[^>]*>/i, '');
  text = text.replace(/<\/body>[\s\S]*$/i, '');

  const lines = text.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length < 15) return false;
    if (/^(תמונה|צילום|photo|credit|image):/i.test(trimmed)) return false;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false;
    return true;
  });

  text = filteredLines.join('\n');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
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

    if (path.includes("/translate")) {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }
      const { text, sourceLanguage, targetLanguage }: TranslateRequest = await req.json();

      const vowelInstruction = targetLanguage === "Hebrew"
        ? " CRITICAL: Include ALL vowel marks (nikud) in the Hebrew translation. The Hebrew text must have full vocalization with all vowel points (nikud)."
        : "";

      const MAX_CHUNK_LENGTH = 3000;
      const sentences = text.split(/(?<=[.!?؟،])\s+/);
      const chunks: string[] = [];
      let currentChunk = "";

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > MAX_CHUNK_LENGTH && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      const translations: string[] = [];

      for (const chunk of chunks) {
        const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}.${vowelInstruction} Provide only the translation, nothing else:\n\n${chunk}`;

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
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${errorText}`);
        }

        const data = await response.json();
        const chunkTranslation = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (chunkTranslation) {
          translations.push(chunkTranslation);
        }
      }

      const translation = translations.join(" ");

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
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

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
    } else if (path.includes("/extract-url")) {
      const { url: targetUrl }: ExtractUrlRequest = await req.json();

      if (!targetUrl) {
        return new Response(
          JSON.stringify({ error: "URL is required" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const urlToFetch = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
      console.log('Fetching URL:', urlToFetch);

      const response = await fetch(urlToFetch, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he,en-US;q=0.9,en;q=0.8',
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
      }

      const html = await response.text();
      console.log('HTML length:', html.length);

      if (html.length < 100) {
        throw new Error("Received too little content from URL");
      }

      const structuredData = extractArticleStructuredData(html);
      console.log('Structured data found:', structuredData);

      let title = structuredData.title || '';
      let content = '';

      if (structuredData.articleBody) {
        const parts = [];
        if (title) parts.push(title);
        if (structuredData.description && !structuredData.articleBody.includes(structuredData.description)) {
          parts.push(structuredData.description);
        }
        parts.push(structuredData.articleBody);
        content = parts.join('\n\n');
      } else {
        content = extractTextFromHtml(html);
      }

      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : 'Untitled';
      }

      if (!content || content.length < 50) {
        throw new Error("Failed to extract readable content from URL. The page might not be an article or is blocking extraction.");
      }

      return new Response(
        JSON.stringify({
          title,
          content,
          excerpt: content.substring(0, 200)
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