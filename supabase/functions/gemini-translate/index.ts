import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders, createErrorResponse } from "./shared.ts";
import { handleTranslate } from "./translate.ts";
import { handleDefine } from "./define.ts";
import { handleExtractUrl } from "./extract-url.ts";
import { handleOcr } from "./ocr.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for authentication (optional - guests allowed for translation)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader && authHeader !== "Bearer null" && authHeader !== "Bearer undefined") {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
        console.log(`Authenticated request from user: ${userId}`);
      } else {
        console.log("Guest mode access (invalid token)");
      }
    } else {
      console.log("Guest mode access (no auth header)");
    }

    // For guests, use a consistent guest identifier for rate limiting
    const rateLimitId = userId || "guest-user";

    if (path.includes("/translate")) {
      return await handleTranslate(req, supabase);
    } else if (path.includes("/define")) {
      return await handleDefine(req, supabase, rateLimitId);
    } else if (path.includes("/extract-url")) {
      return await handleExtractUrl(req);
    } else if (path.includes("/ocr")) {
      return await handleOcr(req, supabase, rateLimitId);
    } else {
      return createErrorResponse("Invalid endpoint", 404);
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return createErrorResponse(message, 500);
  }
});
