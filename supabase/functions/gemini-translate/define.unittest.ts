import { describe, it, expect, vi, afterEach } from "vitest";
import { handleDefine } from "./define.ts";

// handleDefine takes the Supabase client as a parameter and only reaches out to
// Gemini through the global fetch, so we can exercise the whole handler with a
// small chainable stub plus a fetch spy — no network, no real Supabase.
//
// Tables touched:
//   word_definitions      (read) .select().eq().maybeSingle()
//                         (hit)  .update().eq()         (miss) .upsert()
//   api_usage_logs        .insert()
//   gemini_api_rate_limits (miss) rate-limit reads + logRequest insert
//   api_pricing           (miss) getCurrentPricing chain
function makeSupabase(opts: {
  cacheRow?: {
    word_with_vowels: string;
    definition: string;
    transliteration: string;
    examples: unknown[];
    notes: string;
    forms: unknown[];
    access_count: number;
  } | null;
}) {
  const calls = {
    updates: [] as Array<Record<string, unknown>>,
    usageInserts: [] as Array<Record<string, unknown>>,
    upserts: [] as Array<Record<string, unknown>>,
  };

  const supabase = {
    from(table: string) {
      if (table === "word_definitions") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: () => Promise.resolve({ data: opts.cacheRow ?? null, error: null }),
          update: (row: Record<string, unknown>) => {
            calls.updates.push(row);
            return { eq: () => Promise.resolve({ error: null }) };
          },
          upsert: (row: Record<string, unknown>) => {
            calls.upserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
        return builder;
      }
      if (table === "api_usage_logs") {
        return {
          insert: (row: Record<string, unknown>) => {
            calls.usageInserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === "gemini_api_rate_limits") {
        // rate-limit reads (.order resolves the chain) + logRequest insert
        const builder = {
          select: () => builder,
          eq: () => builder,
          gte: () => builder,
          order: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ error: null }),
        };
        return builder;
      }
      // api_pricing — getCurrentPricing. Return "no row" so pricing resolves to null.
      const pricing = {
        select: () => pricing,
        eq: () => pricing,
        lte: () => pricing,
        order: () => pricing,
        limit: () => pricing,
        single: () => Promise.resolve({ data: null, error: { message: "no pricing row" } }),
      };
      return pricing;
    },
  };

  return { supabase, calls };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/define", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleDefine server-side cache", () => {
  it("returns the cached definition without calling Gemini (guest / racing cache hit)", async () => {
    // Guests can't read word_definitions (RLS is SELECT-to-authenticated), so they
    // always reach this endpoint. The server-side check serves the cached row and
    // never pays Gemini.
    const fetchSpy = vi.fn(() => {
      throw new Error("Gemini must not be called on a cache hit");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { supabase, calls } = makeSupabase({
      cacheRow: {
        word_with_vowels: "שָׁלוֹם",
        definition: "peace; hello",
        transliteration: "shalom",
        examples: [],
        notes: "",
        forms: [{ hebrew: "שָׁלֵם", transliteration: "shalem", relationship: "adjective: complete" }],
        access_count: 4,
      },
    });

    const res = await handleDefine(
      makeRequest({ word: "שלום", targetLanguage: "Hebrew" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "guest-user",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.definition).toBe("peace; hello");
    expect(json.wordWithVowels).toBe("שָׁלוֹם");
    expect(json.forms).toHaveLength(1);

    // Access stats bumped and the hit logged as zero-cost, matching the frontend path.
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]).toMatchObject({ access_count: 5 });
    await vi.waitFor(() => expect(calls.usageInserts).toHaveLength(1));
    expect(calls.usageInserts[0]).toMatchObject({
      request_type: "define",
      cache_hit: true,
      model: "cache",
      prompt_tokens: 0,
    });
  });

  it("calls Gemini and caches the result on a cache miss", async () => {
    const geminiText = [
      "WORD: שָׁלוֹם",
      "DEFINITION: peace; hello",
      "TRANSLITERATION: shalom",
      "FORMS:",
      "- שָׁלֵם (shalem) - adjective: complete",
    ].join("\n");
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: geminiText }] }, finishReason: "STOP" }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { supabase, calls } = makeSupabase({ cacheRow: null });

    const res = await handleDefine(
      makeRequest({ word: "שלום", targetLanguage: "Hebrew" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "guest-user",
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(json.definition).toBe("peace; hello");
    expect(calls.upserts).toHaveLength(1);
    expect(calls.upserts[0]).toMatchObject({ word: "שלום", definition: "peace; hello" });
  });
});
