import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    console.log(`Fetching from Sefaria: ${reference}`);

    const sefariaUrl = `https://www.sefaria.org/api/v3/texts/${reference}`;
    const sefariaResponse = await fetch(sefariaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!sefariaResponse.ok) {
      const errorText = await sefariaResponse.text();
      console.error(`Sefaria API error for ${reference}: ${sefariaResponse.status}`);
      console.error(`Error details: ${errorText}`);

      return new Response(
        JSON.stringify({
          error: `Sefaria API returned ${sefariaResponse.status}`,
          reference: reference,
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
    console.log(`Successfully fetched ${reference}`);

    // Check if we have the expected data structure
    if (!data.versions || data.versions.length === 0) {
      console.error(`No versions found for ${reference}`);
      console.error(`Data structure:`, JSON.stringify(data, null, 2));

      return new Response(
        JSON.stringify({
          error: "No text versions available for this prayer",
          reference: reference,
          availableData: Object.keys(data)
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
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