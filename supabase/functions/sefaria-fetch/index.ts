import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RATE_LIMITS = {
  sefaria_fetch: {
    hourly: 60,
    daily: 300,
    name: "Sefaria text fetch",
  },
};

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ allowed: boolean; error?: string }> {
  const limits = RATE_LIMITS.sefaria_fetch;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: hourlyRequests, error: hourlyError } = await supabase
    .from("gemini_api_rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("request_type", "sefaria_fetch")
    .gte("created_at", oneHourAgo.toISOString())
    .order("created_at", { ascending: true });

  if (hourlyError) {
    console.error("Error checking hourly rate limit:", hourlyError);
    return { allowed: true };
  }

  if ((hourlyRequests?.length || 0) >= limits.hourly) {
    const oldestRequest = new Date(hourlyRequests[0].created_at);
    const resetTime = new Date(oldestRequest.getTime() + 60 * 60 * 1000);
    const minutesUntilReset = Math.ceil(
      (resetTime.getTime() - now.getTime()) / (60 * 1000)
    );

    return {
      allowed: false,
      error: `Rate limit exceeded for ${limits.name}. You can make ${limits.hourly} requests per hour. Try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""}.`,
    };
  }

  const { data: dailyRequests, error: dailyError } = await supabase
    .from("gemini_api_rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("request_type", "sefaria_fetch")
    .gte("created_at", oneDayAgo.toISOString())
    .order("created_at", { ascending: true });

  if (dailyError) {
    console.error("Error checking daily rate limit:", dailyError);
    return { allowed: true };
  }

  if ((dailyRequests?.length || 0) >= limits.daily) {
    const oldestRequest = new Date(dailyRequests[0].created_at);
    const resetTime = new Date(oldestRequest.getTime() + 24 * 60 * 60 * 1000);
    const hoursUntilReset = Math.ceil(
      (resetTime.getTime() - now.getTime()) / (60 * 60 * 1000)
    );

    return {
      allowed: false,
      error: `Daily rate limit exceeded for ${limits.name}. You can make ${limits.daily} requests per day. Try again in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? "s" : ""}.`,
    };
  }

  return { allowed: true };
}

async function logRequest(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  await supabase.from("gemini_api_rate_limits").insert({
    user_id: userId,
    request_type: "sefaria_fetch",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for authentication (optional - guests allowed for read-only access)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader && authHeader !== "Bearer null" && authHeader !== "Bearer undefined") {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
        console.log(`Authenticated request from user: ${userId}`);
      } else {
        console.log("Guest mode access (no valid token)");
      }
    } else {
      console.log("Guest mode access (no auth header)");
    }

    // Use consistent guest identifier for rate limiting
    const rateLimitId = userId || "guest-user";

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, rateLimitId);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ error: rateLimitCheck.error }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Reference parameter is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { error: deleteError } = await supabase
      .from("sefaria_cache")
      .delete()
      .lt("cached_at", thirtyDaysAgo.toISOString())
      .lt("last_accessed", sevenDaysAgo.toISOString());

    if (deleteError) {
      console.error("Cache cleanup error:", deleteError);
    }

    const normalizedRef = reference.trim();

    const { data: cached, error: cacheError } = await supabase
      .from("sefaria_cache")
      .select("*")
      .eq("reference", normalizedRef)
      .maybeSingle();

    if (cached && !cacheError) {
      console.log(`Cache hit for ${normalizedRef}`);

      await supabase
        .from("sefaria_cache")
        .update({
          last_accessed: new Date().toISOString(),
          access_count: cached.access_count + 1,
        })
        .eq("id", cached.id);

      return new Response(JSON.stringify(cached.content), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "HIT",
        },
      });
    }

    console.log(`Cache miss for ${normalizedRef}, fetching from Sefaria`);

    // Log the request for rate limiting (only on cache miss - actual API call)
    await logRequest(supabase, rateLimitId);

    const sefariaUrl = `https://www.sefaria.org/api/texts/${normalizedRef}?context=0`;
    const sefariaResponse = await fetch(sefariaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!sefariaResponse.ok) {
      const errorText = await sefariaResponse.text();
      console.error(`Sefaria API error for ${normalizedRef}: ${sefariaResponse.status}`);
      console.error(`Error details: ${errorText}`);

      return new Response(
        JSON.stringify({
          error: `Sefaria API returned ${sefariaResponse.status}`,
          reference: normalizedRef,
          details: errorText
        }),
        {
          status: sefariaResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await sefariaResponse.json();
    console.log(`Successfully fetched ${normalizedRef}`);

    const { error: insertError } = await supabase
      .from("sefaria_cache")
      .insert({
        reference: normalizedRef,
        content: data,
        cached_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
      });

    if (insertError) {
      console.error(`Failed to cache ${normalizedRef}:`, insertError);
    } else {
      console.log(`Cached ${normalizedRef}`);
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
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