import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GEMINI_URL, GEMINI_MODEL, RATE_LIMITS } from "./config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function checkRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
  userId: string,
): Promise<{ allowed: boolean; error?: string }> {
  const limits = RATE_LIMITS.passage_generation;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check hourly limit
  const { data: hourlyRequests, error: hourlyError } = await supabase
    .from("gemini_api_rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("request_type", "passage_generation")
    .gte("created_at", oneHourAgo.toISOString())
    .order("created_at", { ascending: true });

  if (hourlyError) {
    console.error("Error checking hourly rate limit:", hourlyError);
    return { allowed: true };
  }

  if ((hourlyRequests?.length || 0) >= limits.hourly) {
    const oldestRequest = new Date(hourlyRequests![0].created_at);
    const resetTime = new Date(oldestRequest.getTime() + 60 * 60 * 1000);
    const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 1000));

    return {
      allowed: false,
      error: `Rate limit exceeded for ${limits.name}. You can generate ${limits.hourly} passages per hour. Try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""}.`,
    };
  }

  // Check daily limit
  const { data: dailyRequests, error: dailyError } = await supabase
    .from("gemini_api_rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("request_type", "passage_generation")
    .gte("created_at", oneDayAgo.toISOString())
    .order("created_at", { ascending: true });

  if (dailyError) {
    console.error("Error checking daily rate limit:", dailyError);
    return { allowed: true };
  }

  if ((dailyRequests?.length || 0) >= limits.daily) {
    const oldestRequest = new Date(dailyRequests![0].created_at);
    const resetTime = new Date(oldestRequest.getTime() + 24 * 60 * 60 * 1000);
    const hoursUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 60 * 1000));

    return {
      allowed: false,
      error: `Daily rate limit exceeded for ${limits.name}. You can generate ${limits.daily} passages per day. Try again in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? "s" : ""}.`,
    };
  }

  return { allowed: true };
}

async function logRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
  userId: string,
): Promise<void> {
  await supabase.from("gemini_api_rate_limits").insert({
    user_id: userId,
    request_type: "passage_generation",
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to validate user, but allow guest access
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    // Determine rate limit ID - use user.id for authenticated users, 'guest-user' for guests
    let rateLimitId: string;
    if (user) {
      rateLimitId = user.id;
      console.log(`Passage generation request from user: ${user.id}`);
    } else {
      rateLimitId = "guest-user";
      console.log("Passage generation request from guest user");
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, rateLimitId);
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for: ${rateLimitId}`);
      return new Response(JSON.stringify({ error: rateLimitCheck.error }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating passage with prompt length: ${prompt.length}`);

    // Log the request for rate limiting
    await logRequest(supabase, rateLimitId);

    // Call Gemini API
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 16384,
            // Disable thinking mode to prevent token budget consumption
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const candidate = geminiData.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const passage = candidate?.content?.parts?.[0]?.text;
    const usageMeta = geminiData.usageMetadata || {};
    const inputTokens = usageMeta.promptTokenCount || 0;
    const outputTokens = usageMeta.candidatesTokenCount || 0;
    const thinkingTokens = usageMeta.thoughtsTokenCount || 0;

    console.log(`Gemini finish reason: ${finishReason}`);
    console.log(`Token usage - input: ${inputTokens}, output: ${outputTokens}, thinking: ${thinkingTokens}`);

    if (!passage) {
      console.error("No passage generated from Gemini response:", geminiData);
      throw new Error("Failed to generate passage");
    }

    if (finishReason === "MAX_TOKENS") {
      console.warn("Output may be truncated due to token limit");
    }

    console.log(`Successfully generated passage with length: ${passage.length}`);

    // Log usage with pricing reference (fire-and-forget)
    const logUsage = async () => {
      try {
        const { data: pricing } = await supabase
          .from("api_pricing")
          .select("id")
          .eq("model", GEMINI_MODEL)
          .lte("effective_from", new Date().toISOString())
          .order("effective_from", { ascending: false })
          .limit(1)
          .single();

         // Hash user_id for privacy before logging
         const encoder = new TextEncoder();
         const hashData = encoder.encode(rateLimitId);
         const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
         const hashArray = Array.from(new Uint8Array(hashBuffer));
         const hashedUserId = hashArray.map((b: number) => b.toString(16).padStart(2, "0")).join("");

         await supabase.from("api_usage_logs").insert({
           user_id: hashedUserId,
           request_type: "passage_generation",
           endpoint: "/generate-hebrew-passage",
           prompt_tokens: inputTokens,
           candidates_tokens: outputTokens,
           thinking_tokens: thinkingTokens,
           cache_hit: false,
           model: GEMINI_MODEL,
           pricing_id: pricing?.id || null,
         });
        console.log("Logged passage generation usage");
      } catch (err) {
        console.error("Failed to log usage:", err);
      }
    };
    logUsage();

    return new Response(JSON.stringify({ passage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-hebrew-passage:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
