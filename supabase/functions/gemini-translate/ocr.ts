import { GEMINI_URL, GEMINI_MODEL } from "./config.ts";
import {
  corsHeaders,
  checkRateLimit,
  logRequest,
  logApiUsage,
  extractUsageMetadata,
  createErrorResponse,
  createJsonResponse,
  SupabaseClient,
} from "./shared.ts";

export interface ImageOcrRequest {
  imageData: string; // base64 encoded image
}

export async function handleOcr(
  req: Request,
  supabase: SupabaseClient,
  rateLimitId: string,
): Promise<Response> {
  const { imageData }: ImageOcrRequest = await req.json();

  if (!imageData) {
    return createErrorResponse("Image data is required", 400);
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

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Image OCR failed: ${errorText}`);
  }

  const data = await response.json();
  const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = extractUsageMetadata(data);

  console.log("Extracted text length:", extractedText.length);
  console.log("First 200 chars:", extractedText.substring(0, 200));
  console.log(`Token usage - input: ${usage.promptTokenCount}, output: ${usage.candidatesTokenCount}, thinking: ${usage.thoughtsTokenCount}`);

  if (!extractedText.trim()) {
    return createErrorResponse("No Hebrew text found in the image. Please try a clearer image.", 400);
  }

  // Log usage (fire-and-forget)
  logApiUsage(supabase, rateLimitId, "ocr", "/ocr", usage, GEMINI_MODEL).catch(
    (err: unknown) => console.error("Failed to log OCR usage:", err)
  );

  return createJsonResponse({ hebrewText: extractedText.trim() });
}
