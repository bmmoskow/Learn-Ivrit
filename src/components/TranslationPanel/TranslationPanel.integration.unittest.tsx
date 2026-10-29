import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { User } from "@supabase/supabase-js";
import { TranslationPanel } from "./TranslationPanel";
import { supabase } from "../../../supabase/client";

// In-process integration test for the CORE TRANSLATION FLOW. Unlike the unit
// tests (which stub useTranslationPanel wholesale), this renders the REAL
// container → hook → UI → WordDefinitionPopup tree and only mocks the two
// backends: Supabase (global mock from src/test/setup.ts, refined per-test
// below) and the Gemini edge functions (global fetch). It proves the journey
// wires together end to end:
//   paste Hebrew → (mock) Gemini translation renders → click a word →
//   WordDefinitionPopup opens with the (mock) definition → save to vocabulary.

// Auth is the one in-app dependency we control directly: the flow needs a
// signed-in user to be able to save, and AuthProvider's own Supabase round-trip
// is out of scope here (it has its own integration suite).
vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockUser: User = {
  id: "user-1",
  email: "learner@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
};

// The Gemini definition the edge function "returns" for the clicked word. The
// semicolon keeps shortEnglish from being truncated (see wordDefinitionPopupUtils),
// so the popup shows both glosses.
const DEFINITION_RESPONSE = {
  wordWithVowels: "שָׁלוֹם",
  definition: "Peace; hello, a common greeting.",
  transliteration: "shalom",
  examples: [],
  notes: "",
  forms: [],
};

// Records every Supabase insert so we can assert the save actually happened.
let inserts: Array<{ table: string; payload: unknown }>;

/**
 * A permissive chainable query-builder stand-in. Terminal reads resolve empty
 * (cache miss / nothing saved yet); `.single()` returns a row id so the save
 * insert().select().single() chain yields a usable record.
 */
function installSupabaseQueryMock() {
  inserts = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from = vi.fn((table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.gte = vi.fn(self);
    chain.lte = vi.fn(self);
    chain.order = vi.fn(self);
    chain.limit = vi.fn(self);
    chain.update = vi.fn(self);
    chain.delete = vi.fn(self);
    chain.upsert = vi.fn(self);
    chain.insert = vi.fn((payload: unknown) => {
      inserts.push({ table, payload });
      return chain;
    });
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    chain.single = vi.fn(() => Promise.resolve({ data: { id: "vocab-row-1" }, error: null }));
    // Awaiting the chain directly (e.g. loadSavedWords, rate-limit checks)
    // yields an empty result set.
    chain.then = (resolve: (r: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null });
    return chain;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
}

/** Route Gemini edge-function calls to canned responses based on the path. */
function installFetchMock() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("/define") ? DEFINITION_RESPONSE : { translation: "peace world" };
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function setAuth(value: { user: User | null; isGuest: boolean }) {
  const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
  vi.mocked(useAuth).mockReturnValue({
    user: value.user,
    isGuest: value.isGuest,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInAsGuest: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  });
}

const renderPanel = () =>
  render(
    <MemoryRouter>
      <TranslationPanel />
    </MemoryRouter>,
  );

describe("TranslationPanel integration — core translation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installSupabaseQueryMock();
    installFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("translates pasted Hebrew, defines a clicked word, and saves it to vocabulary", async () => {
    const user = userEvent.setup();
    await setAuth({ user: mockUser, isGuest: false });

    renderPanel();

    // 1. Open the paste dialog from the empty-state launcher and enter Hebrew.
    await user.click(screen.getByRole("button", { name: /paste or type/i }));
    const textarea = await screen.findByPlaceholderText(/type or paste your text/i);
    await user.type(textarea, "שלום עולם");
    await user.click(screen.getByRole("button", { name: /^translate$/i }));

    // 2. The (mocked) Gemini translation renders alongside the source text.
    expect(await screen.findByText("peace world")).toBeInTheDocument();

    // 3. Click a Hebrew word → the definition popup opens and fetches its meaning.
    await user.click(screen.getByText("שלום"));
    expect(await screen.findByText("Peace")).toBeInTheDocument();
    expect(await screen.findByText("hello, a common greeting.")).toBeInTheDocument();

    // 4. Save the word — the button flips to its saved state and the row is inserted.
    await user.click(screen.getByRole("button", { name: /add to vocabulary/i }));
    expect(await screen.findByRole("button", { name: /saved to vocabulary/i })).toBeInTheDocument();

    const vocabInsert = inserts.find((i) => i.table === "vocabulary_words");
    expect(vocabInsert).toBeDefined();
    expect(vocabInsert?.payload).toMatchObject({
      user_id: mockUser.id,
      hebrew_word: "שָׁלוֹם",
    });
  });

  it("lets a guest see a definition but blocks saving (sign-in prompt, disabled button)", async () => {
    const user = userEvent.setup();
    await setAuth({ user: null, isGuest: true });

    renderPanel();

    await user.click(screen.getByRole("button", { name: /paste or type/i }));
    const textarea = await screen.findByPlaceholderText(/type or paste your text/i);
    await user.type(textarea, "שלום עולם");
    await user.click(screen.getByRole("button", { name: /^translate$/i }));

    expect(await screen.findByText("peace world")).toBeInTheDocument();

    await user.click(screen.getByText("שלום"));

    // Guests still get the definition...
    expect(await screen.findByText("Peace")).toBeInTheDocument();
    // ...but are prompted to sign up and cannot save.
    expect(screen.getByText(/sign up for an account to save/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to vocabulary/i })).toBeDisabled();

    await waitFor(() => {
      expect(inserts.find((i) => i.table === "vocabulary_words")).toBeUndefined();
    });
  });
});
