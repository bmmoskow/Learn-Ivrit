import { describe, it, expect, vi, afterEach } from "vitest";
import { handleTranslate } from "./translate.ts";

// handleTranslate takes the Supabase client as a parameter and only reaches out
// to Gemini through the global fetch, so we can exercise the whole handler with
// a small chainable stub plus a fetch spy — no network, no real Supabase.
//
// Only the calls handleTranslate actually makes are wired up:
//   translation_cache: .select().eq().maybeSingle()  (read) / .insert()  (write)
//   api_usage_logs:    .insert()
//   api_pricing:       .select().eq().lte().order().limit().single()  (miss only)
//   rpc("increment_translation_access", …)
function makeSupabase(opts: { cacheRow?: { id: string; translation: string } | null }) {
  const calls = {
    rpc: [] as Array<{ name: string; args: unknown }>,
    usageInserts: [] as Array<Record<string, unknown>>,
    cacheInserts: [] as Array<Record<string, unknown>>,
  };

  const supabase = {
    from(table: string) {
      if (table === "translation_cache") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: () => Promise.resolve({ data: opts.cacheRow ?? null, error: null }),
          insert: (row: Record<string, unknown>) => {
            calls.cacheInserts.push(row);
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
      // api_pricing — only hit on a miss, via logApiUsage → getCurrentPricing.
      // Return "no row" so pricing resolves to null (cache hits never cost).
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
    rpc: (name: string, args: unknown) => {
      calls.rpc.push({ name, args });
      // The handler calls .then() on the rpc result fire-and-forget.
      return { then: (fn?: () => void) => { fn?.(); return Promise.resolve(); } };
    },
  };

  return { supabase, calls };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/translate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleTranslate server-side cache", () => {
  it("returns the cached translation without calling Gemini (guest / racing cache hit)", async () => {
    // Guests can't read translation_cache (RLS is SELECT-to-authenticated), so they
    // always reach this endpoint. This is the whole point of the server-side check:
    // serve the cached row and never pay Gemini.
    const fetchSpy = vi.fn(() => {
      throw new Error("Gemini must not be called on a cache hit");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { supabase, calls } = makeSupabase({
      cacheRow: { id: "cache-123", translation: "the cached translation" },
    });

    const res = await handleTranslate(
      makeRequest({ text: "שלום", sourceLanguage: "Hebrew", targetLanguage: "English" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "guest-user",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.translation).toBe("the cached translation");

    // Access stats bumped and the cache hit logged as zero-cost, matching the
    // frontend cache-hit path so admin cost tracking stays consistent.
    expect(calls.rpc).toContainEqual({
      name: "increment_translation_access",
      args: { cache_id: "cache-123" },
    });
    await vi.waitFor(() => expect(calls.usageInserts).toHaveLength(1));
    expect(calls.usageInserts[0]).toMatchObject({
      request_type: "translate",
      cache_hit: true,
      model: "cache",
      prompt_tokens: 0,
      candidates_tokens: 0,
    });
  });

  it("calls Gemini and caches the result on a cache miss", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "fresh translation" }] }, finishReason: "STOP" }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { supabase, calls } = makeSupabase({ cacheRow: null });

    const res = await handleTranslate(
      makeRequest({ text: "שלום", sourceLanguage: "Hebrew", targetLanguage: "English" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "guest-user",
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(json.translation).toBe("fresh translation");
    expect(calls.cacheInserts).toHaveLength(1);
    expect(calls.cacheInserts[0]).toMatchObject({ translation: "fresh translation" });
  });
});
