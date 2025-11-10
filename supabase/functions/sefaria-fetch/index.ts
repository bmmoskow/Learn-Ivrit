import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SefariaRequest {
  reference: string;
}

interface SefariaVersion {
  language: string;
  text: string[];
  versionTitle: string;
}

interface SefariaResponse {
  versions: SefariaVersion[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { reference }: SefariaRequest = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Reference is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const sefariaUrl = `https://www.sefaria.org/api/v3/texts/${reference}`;
    
    const response = await fetch(sefariaUrl);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch from Sefaria: ${response.statusText}`,
          status: response.status 
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data: SefariaResponse = await response.json();

    const hebrewVersion = data.versions.find(v => v.language === "he");
    
    if (!hebrewVersion || !hebrewVersion.text) {
      return new Response(
        JSON.stringify({ error: "No Hebrew text found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const hebrewText = hebrewVersion.text
      .map(line => line.replace(/<[^>]*>/g, ''))
      .join('\n');

    return new Response(
      JSON.stringify({ 
        text: hebrewText,
        source: hebrewVersion.versionTitle,
        reference 
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
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