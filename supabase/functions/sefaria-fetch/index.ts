import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
        console.log(`Authenticated request from user: ${userId}`);
      } else {
        // Guest mode - allow read-only access without valid token
        console.log("Guest mode access (no valid token)");
      }
    } else {
      console.log("Guest mode access (no auth header)");
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