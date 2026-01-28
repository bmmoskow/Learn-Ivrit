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
}

async function callGeminiAPI(request: GeminiRequest): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          topK: request.topK ?? 40,
          topP: request.topP ?? 0.95,
          maxOutputTokens: request.maxOutputTokens ?? 2048,
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
  passage_generation: {
    hourly: 20,
    daily: 50,
    name: "passage generation",
  },
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
    const passage = await callGeminiAPI({ prompt });

    if (!passage) {
      throw new Error("Failed to generate passage");
    }

    console.log(`Successfully generated passage with length: ${passage.length}`);

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
