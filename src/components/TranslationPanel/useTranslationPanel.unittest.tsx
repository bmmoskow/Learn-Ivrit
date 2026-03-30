import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { useTranslationPanel } from "./useTranslationPanel";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";
import { requestDeduplicator } from "../../utils/requestDeduplicator/requestDeduplicator";

const { mockNotifyNewTransaction, mockClearLastTransaction } = vi.hoisted(() => ({
  mockNotifyNewTransaction: vi.fn(),
  mockClearLastTransaction: vi.fn(),
}));

vi.mock("../Admin/useLastTransaction", () => ({
  notifyNewTransaction: mockNotifyNewTransaction,
  clearLastTransaction: mockClearLastTransaction,
}));

// Mock the Supabase client
vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

// Mock getAuthHeader - this creates a passthrough that uses the mocked supabase
// We re-export the real implementation which will use the mocked supabase.auth.getSession
vi.mock("../../utils/auth/getAuthHeader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/auth/getAuthHeader")>();
  return actual;
});

// Mock fetch for edge function calls
const mockFetch = vi.fn() as Mock<typeof fetch>;
global.fetch = mockFetch;

// Import the mocked supabase after mocking
import { supabase } from "../../../supabase/client";

// Typed mock accessors
const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);

// Wrapper to provide AuthContext
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

// Helper to mock a successful translation flow (for tests that use setHebrewText which now auto-translates)
const setupTranslationMocks = () => {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: { id: "test-user", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
      },
    },
    error: null,
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ translation: "Translation result" }),
  } as Response);
};

describe("useTranslationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    requestDeduplicator.clear();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: "test-sub", callback: vi.fn() } },
    } as ReturnType<typeof supabase.auth.onAuthStateChange>);
    mockFetch.mockReset();
  });

  describe("initial state", () => {
    it("has correct initial values", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      expect(result.current.hebrewText).toBe("");
      expect(result.current.englishText).toBe("");
      expect(result.current.translating).toBe(false);
      expect(result.current.error).toBe("");
      expect(result.current.selectedWord).toBeNull();
      expect(result.current.urlInput).toBe("");
      expect(result.current.showUrlInput).toBe(false);
      expect(result.current.loadingUrl).toBe(false);
      expect(result.current.selectedBook).toBe("");
      expect(result.current.selectedChapter).toBe(1);
      expect(result.current.showBibleInput).toBe(false);
      expect(result.current.loadingBible).toBe(false);
      expect(result.current.bibleLoaded).toBe(false);
      expect(result.current.currentBibleRef).toBeNull();
      expect(result.current.processingImage).toBe(false);
      expect(result.current.showBookmarkManager).toBe(false);
      expect(result.current.showSaveBookmark).toBe(false);
      expect(result.current.currentSource).toBeNull();
    });
  });

  describe("setters", () => {
    it("setHebrewText updates hebrewText and triggers translation", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      // Wait for translation to complete
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(result.current.hebrewText).toBe("שלום");
    });

    it("setHebrewText clears bible state and sets source", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Manually set some state that should be cleared
      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(5);
      });

      await act(async () => {
        result.current.setHebrewText("טקסט חדש");
      });

      // importHebrewContent clears bible state by default
      expect(result.current.bibleLoaded).toBe(false);
      expect(result.current.currentBibleRef).toBeNull();
      expect(result.current.translationDirection).toBe("hebrew-to-english");
    });

    it("setUrlInput updates urlInput", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      expect(result.current.urlInput).toBe("https://example.com");
    });

    it("setShowUrlInput updates showUrlInput", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setShowUrlInput(true);
      });

      expect(result.current.showUrlInput).toBe(true);
    });

    it("setSelectedBook updates selectedBook", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
      });

      expect(result.current.selectedBook).toBe("Genesis");
    });

    it("setSelectedChapter updates selectedChapter", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedChapter(5);
      });

      expect(result.current.selectedChapter).toBe(5);
    });

    it("setShowBibleInput updates showBibleInput", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setShowBibleInput(true);
      });

      expect(result.current.showBibleInput).toBe(true);
    });

    it("setShowBookmarkManager updates showBookmarkManager", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setShowBookmarkManager(true);
      });

      expect(result.current.showBookmarkManager).toBe(true);
    });

    it("setShowSaveBookmark updates showSaveBookmark", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setShowSaveBookmark(true);
      });

      expect(result.current.showSaveBookmark).toBe(true);
    });

    it("setSelectedWord updates selectedWord", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const word = { word: "שלום", sentence: "שלום עולם", position: { x: 100, y: 200 } };
      act(() => {
        result.current.setSelectedWord(word);
      });

      expect(result.current.selectedWord).toEqual(word);
    });
  });

  describe("importHebrewContent (via setHebrewText)", () => {
    it("sets translation direction to hebrew-to-english", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      expect(result.current.translationDirection).toBe("hebrew-to-english");
    });

    it("uses cached translation when provided (via handleLoadBookmark)", async () => {
      // handleLoadBookmark passes cachedTranslation option
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.handleLoadBookmark({
          id: "1",
          name: "Test Bookmark",
          hebrew_text: "שלום",
          user_id: "user1",
          folder_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          source: null,
        });
      });

      // Should set hebrew text without making API call (no session mocked)
      expect(result.current.hebrewText).toBe("שלום");
      // Fetch should not be called since we're using the bookmark flow
      // and there's no explicit translation request
    });

    it("clears bible state by default", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Manually set bibleLoaded to simulate loaded state
      // (normally set by loadFromBible success)
      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      expect(result.current.bibleLoaded).toBe(false);
      expect(result.current.currentBibleRef).toBeNull();
    });

    it("sets source when provided", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.handleLoadBookmark({
          id: "1",
          name: "Test Bookmark",
          hebrew_text: "שלום עולם",
          user_id: "user1",
          folder_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          source: "https://example.com/source",
        });
      });

      expect(result.current.currentSource).toBe("https://example.com/source");
    });

    it("does not trigger translation for empty text", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Wait a bit for any pending async operations from previous tests to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Clear any lingering calls from previous tests
      mockFetch.mockClear();

      await act(async () => {
        result.current.setHebrewText("");
      });

      // Fetch should not be called for empty text
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("triggers translation for non-empty text", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("clearAll", () => {
    it("resets all text and navigation state", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Set some state first
      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.hebrewText).toBe("");
      expect(result.current.englishText).toBe("");
      expect(result.current.bibleLoaded).toBe(false);
      expect(result.current.currentBibleRef).toBeNull();
      expect(result.current.currentSource).toBeNull();
    });
  });

  describe("canNavigatePrev", () => {
    it("returns false when no bible ref", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      expect(result.current.canNavigatePrev()).toBe(false);
    });
  });

  describe("canNavigateNext", () => {
    it("returns false when no bible ref", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      expect(result.current.canNavigateNext()).toBe(false);
    });
  });

  describe("handleCopy", () => {
    it("calls navigator.clipboard.writeText", () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.handleCopy("test text");
      });

      expect(mockWriteText).toHaveBeenCalledWith("test text");
    });
  });

  describe("handleLoadBookmark", () => {
    it("loads bookmark hebrew text and clears english", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const bookmark = {
        id: "123",
        user_id: "user-1",
        name: "Test Bookmark",
        hebrew_text: "בראשית ברא אלהים",
        source: "Genesis 1:1",
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        result.current.handleLoadBookmark(bookmark);
      });

      expect(result.current.hebrewText).toBe("בראשית ברא אלהים");
      expect(result.current.englishText).toBe("");
      expect(result.current.currentSource).toBe("Genesis 1:1");
      expect(result.current.bibleLoaded).toBe(false);
      expect(result.current.currentBibleRef).toBeNull();
      expect(result.current.showBookmarkManager).toBe(false);
    });
  });

  describe("loadFromUrl", () => {
    it("does nothing when urlInput is empty", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Clear any initial translation calls
      mockFetch.mockClear();

      await act(async () => {
        await result.current.loadFromUrl();
      });

      // Should not call extract-url endpoint when urlInput is empty
      expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("/extract-url"), expect.anything());
      expect(result.current.loadingUrl).toBe(false);
    });

    it("sets error on fetch failure", async () => {
      // Need a session for loadFromUrl to attempt the API call
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-token",
            refresh_token: "test-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: "test-user",
              email: "test@test.com",
              aud: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: "",
            },
          },
        },
        error: null,
      });
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loadingUrl).toBe(false);
    });

    it("requires authentication and uses session access_token", async () => {
      const testToken = "my-secure-session-token";
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: testToken,
            refresh_token: "test-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: "test-user",
              email: "test@test.com",
              aud: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: "",
            },
          },
        },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: "שלום עולם" }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew-article");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      // Verify the Authorization header uses the session token, NOT the anon key
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/gemini-translate/extract-url"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`,
          }),
        }),
      );
    });

    it("allows guests to load URL content using anon key", async () => {
      // No session - guest mode
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

      mockFetch.mockImplementation((input) => {
        const url = String(input);

        if (url.includes("/gemini-translate/extract-url")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ content: "טקסט עברי מהאתר" }),
          } as unknown as Response);
        }

        if (url.includes("/gemini-translate/translate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ translation: "Hebrew text from website" }),
          } as unknown as Response);
        }

        throw new Error(`Unexpected fetch URL in test: ${url}`);
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew-article");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      // Verify fetch was called with anon key for guest
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/gemini-translate/extract-url"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-anon-key",
          }),
        }),
      );

      expect(result.current.hebrewText).toBe("טקסט עברי מהאתר");
      expect(result.current.error).toBe("");
      expect(result.current.loadingUrl).toBe(false);

      vi.unstubAllEnvs();
    });

    it("uses session token for authenticated users loading URLs", async () => {
      const testToken = "valid-token";
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: testToken,
            refresh_token: "test-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: "test-user",
              email: "test@test.com",
              aud: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: "",
            },
          },
        },
        error: null,
      });

      mockFetch.mockImplementation((input) => {
        const url = String(input);

        if (url.includes("/gemini-translate/extract-url")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ content: "בראשית ברא אלהים" }),
          } as unknown as Response);
        }

        if (url.includes("/gemini-translate/translate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ translation: "In the beginning God created" }),
          } as unknown as Response);
        }

        throw new Error(`Unexpected fetch URL in test: ${url}`);
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://hebrew-news.com/article");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      // Verify fetch was called with session token for authenticated user
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/gemini-translate/extract-url"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`,
          }),
        }),
      );

      expect(result.current.hebrewText).toBe("בראשית ברא אלהים");

      await vi.waitFor(() => {
        expect(result.current.englishText).toBe("In the beginning God created");
      });

      // Ensure the translate endpoint was called (regression for "stuck on placeholder")
      expect(mockFetch.mock.calls.some(([u]) => String(u).includes("/gemini-translate/translate"))).toBe(true);

      expect(result.current.error).toBe("");
      expect(result.current.loadingUrl).toBe(false);
      expect(result.current.showUrlInput).toBe(false);
      expect(result.current.urlInput).toBe("");
      expect(result.current.currentSource).toBe("https://hebrew-news.com/article");
    });

    it("handles rate limit errors for guest URL loading", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve(JSON.stringify({ error: "Rate limit exceeded. Try again later." })),
      } as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew-article");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Rate limit exceeded. Try again later.");
      expect(result.current.loadingUrl).toBe(false);

      vi.unstubAllEnvs();
    });
    it("shows specific message for 403 Forbidden errors", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ error: "This website blocks automated text extraction. Try copying and pasting the article text manually using the \"Paste / Type\" option instead." })),
      } as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://www.calcalist.co.il/article/test");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toContain("blocks automated text extraction");
      expect(result.current.error).toContain("Paste / Type");
      expect(result.current.loadingUrl).toBe(false);

      vi.unstubAllEnvs();
    });

    it("shows specific message when error message contains Forbidden", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

      mockFetch.mockRejectedValue(new Error("Request failed: Forbidden"));

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://blocked-site.com/article");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Request failed: Forbidden");
      expect(result.current.loadingUrl).toBe(false);

      vi.unstubAllEnvs();
    });

    it("shows generic error for non-403 failures", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

      mockFetch.mockRejectedValue(new Error("Connection timeout"));

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/article");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error.toLowerCase()).toMatch(/time.*out|timeout/);
      expect(result.current.error).not.toContain("blocks automated");
      expect(result.current.loadingUrl).toBe(false);

      vi.unstubAllEnvs();
    });
  });

  describe("loadFromBible", () => {
    it("does nothing when no book selected", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("sets error on fetch failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.error).toBe("Failed to load Bible chapter. Please try again.");
      expect(result.current.loadingBible).toBe(false);
    });

    it("sets loading state during fetch", async () => {
      let resolvePromise: (value: Response) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      let loadPromise: Promise<void>;
      act(() => {
        loadPromise = result.current.loadFromBible();
      });

      expect(result.current.loadingBible).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ he: ["בראשית"] }),
        } as unknown as Response);
        await loadPromise;
      });

      expect(result.current.loadingBible).toBe(false);
    });

    it("sets bibleLoaded and currentBibleRef on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["בראשית", "ברא", "אלהים"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.bibleLoaded).toBe(true);
      expect(result.current.currentBibleRef).toEqual({ book: "Genesis", chapter: 1 });
      expect(result.current.showBibleInput).toBe(false);
      expect(result.current.currentSource).toBe("Genesis 1");
    });
  });

  describe("syncedParagraphs", () => {
    it("returns null when hebrewText is empty", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      expect(result.current.syncedParagraphs).toBeNull();
    });

    it("computes synced paragraphs when hebrewText is set", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("פסקה ראשונה\n\nפסקה שנייה");
      });

      // Wait for translation to complete and synced paragraphs to be computed
      await vi.waitFor(() => {
        expect(result.current.syncedParagraphs).toHaveLength(2);
      });

      expect(result.current.syncedParagraphs![0].hebrew).toBe("פסקה ראשונה");
      expect(result.current.syncedParagraphs![1].hebrew).toBe("פסקה שנייה");
    });
  });

  describe("navigateChapter", () => {
    it("does nothing when no currentBibleRef", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.navigateChapter("next");
      });

      // Should not crash, no change expected
      expect(result.current.currentBibleRef).toBeNull();
    });

    it("navigates to previous chapter when possible", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["פסוק ראשון"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // First load chapter 5
      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(5);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.currentBibleRef).toEqual({ book: "Genesis", chapter: 5 });

      // Clear previous calls to count only navigation calls
      mockFetch.mockClear();

      // Navigate to previous
      await act(async () => {
        result.current.navigateChapter("prev");
      });

      // Should have called sefaria-fetch for chapter 4
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/sefaria-fetch"), expect.anything());
    });

    it("navigates to next chapter when possible", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["פסוק ראשון"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // First load chapter 1
      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      // Clear previous calls to count only navigation calls
      mockFetch.mockClear();

      // Navigate to next
      await act(async () => {
        result.current.navigateChapter("next");
      });

      // Should have called sefaria-fetch for chapter 2
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/sefaria-fetch"), expect.anything());
    });
  });

  describe("handleWordClick", () => {
    it("sets selectedWord with cleaned word and sentence context", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום עולם. זה משפט שני.");
      });

      // Wait for translation to complete
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const mockEvent = {
        target: {
          textContent: "שלום",
          getBoundingClientRect: () => ({ left: 100, width: 50, bottom: 200 }),
        },
      } as unknown as React.MouseEvent<HTMLSpanElement>;

      act(() => {
        result.current.handleWordClick(mockEvent);
      });

      expect(result.current.selectedWord).toEqual({
        word: "שלום",
        sentence: "שלום עולם",
        position: { x: 125, y: 205 },
      });
    });

    it("does nothing for empty word", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const mockEvent = {
        target: {
          textContent: "",
          getBoundingClientRect: () => ({ left: 100, width: 50, bottom: 200 }),
        },
      } as unknown as React.MouseEvent<HTMLSpanElement>;

      act(() => {
        result.current.handleWordClick(mockEvent);
      });

      expect(result.current.selectedWord).toBeNull();
    });
  });

  describe("loadSavedWords", () => {
    it("does nothing when user is not logged in", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        await result.current.loadSavedWords();
      });

      expect(result.current.savedWords.size).toBe(0);
    });
  });

  describe("loadFromUrl success", () => {
    it("loads content and updates state on success", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: "test-user-id", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
          },
        },
        error: null,
      });

      mockFetch.mockImplementation((input) => {
        const url = String(input);
        if (url.includes("/gemini-translate/extract-url")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ content: "תוכן מהאתר" }),
          } as unknown as Response);
        }
        if (url.includes("/gemini-translate/translate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ translation: "Content from website" }),
          } as unknown as Response);
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.hebrewText).toBe("תוכן מהאתר");
      });
      expect(result.current.showUrlInput).toBe(false);
      expect(result.current.urlInput).toBe("");
      expect(result.current.currentSource).toBe("https://example.com/hebrew");
      expect(result.current.bibleLoaded).toBe(false);
    });
  });

  describe("triggerFileInput", () => {
    it("calls click on fileInputRef when available", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // fileInputRef is null by default, so this should not throw
      act(() => {
        result.current.triggerFileInput();
      });

      // No error means success - ref.current is null so click() is not called
      expect(result.current.fileInputRef.current).toBeNull();
    });
  });

  describe("error state", () => {
    it("sets error on non-ok response from loadFromUrl", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: "test-user-id", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
          },
        },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: "Unable to extract content from this URL" })),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/bad");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Unable to extract content from this URL");
    });

    it("sets error on non-ok response from loadFromBible", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.error).toBe("Failed to load Bible chapter. Please try again.");
    });
  });

  describe("canNavigatePrev with bible ref", () => {
    it("returns true when on chapter > 1", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["text"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(5);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.canNavigatePrev()).toBe(true);
    });

    it("returns false when on chapter 1", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["text"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.canNavigatePrev()).toBe(false);
    });
  });

  describe("canNavigateNext with bible ref", () => {
    it("returns true when not on last chapter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["text"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.canNavigateNext()).toBe(true);
    });
  });

  describe("Bible verse formatting", () => {
    it("formats multiple verses with numbers and paragraph breaks", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            he: ["בראשית ברא אלהים", "והארץ היתה תהו ובהו", "ויאמר אלהים יהי אור"],
          }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.hebrewText).toContain("(1)");
      expect(result.current.hebrewText).toContain("(2)");
      expect(result.current.hebrewText).toContain("(3)");
      expect(result.current.hebrewText).toContain("בראשית ברא אלהים");
    });

    it("removes HTML tags from verses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["<b>בראשית</b> ברא <i>אלהים</i>"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.hebrewText).not.toContain("<b>");
      expect(result.current.hebrewText).not.toContain("</b>");
      expect(result.current.hebrewText).not.toContain("<i>");
    });

    it("sets correct source for loaded Bible chapter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["verse"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Exodus");
        result.current.setSelectedChapter(3);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.currentSource).toBe("Exodus 3");
    });
  });

  describe("handleLoadBookmark", () => {
    it("sets hebrew text and clears translation", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const bookmark = {
        id: "bm-1",
        user_id: "user-1",
        name: "My Bookmark",
        hebrew_text: "שמע ישראל יהוה אלהינו יהוה אחד",
        source: "Deuteronomy 6:4",
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        result.current.handleLoadBookmark(bookmark);
      });

      expect(result.current.hebrewText).toBe("שמע ישראל יהוה אלהינו יהוה אחד");
      expect(result.current.englishText).toBe("");
      expect(result.current.currentSource).toBe("Deuteronomy 6:4");
    });

    it("clears Bible state when loading bookmark", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const bookmark = {
        id: "bm-2",
        user_id: "user-1",
        name: "Custom Passage",
        hebrew_text: "ברוך אתה",
        source: null,
        folder_id: "folder-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        result.current.handleLoadBookmark(bookmark);
      });

      expect(result.current.bibleLoaded).toBe(false);
      expect(result.current.currentBibleRef).toBeNull();
      expect(result.current.showBookmarkManager).toBe(false);
    });

    it("handles bookmark with null source", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const bookmark = {
        id: "bm-3",
        user_id: "user-1",
        name: "No Source",
        hebrew_text: "טקסט כלשהו",
        source: null,
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        result.current.handleLoadBookmark(bookmark);
      });

      expect(result.current.currentSource).toBeNull();
      expect(result.current.hebrewText).toBe("טקסט כלשהו");
    });
  });

  describe("handleFileSelect for image OCR", () => {
    it("does nothing when no file selected", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const event = {
        target: { files: null },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.processingImage).toBe(false);
    });

    it("does nothing when files array is empty", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      const event = {
        target: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.processingImage).toBe(false);
    });
  });

  describe("clearAll", () => {
    it("resets translation direction to hebrew-to-english", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // First load some Bible content
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["verse"] }),
      } as unknown as Response);

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      // Now clear
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.hebrewText).toBe("");
      expect(result.current.englishText).toBe("");
      expect(result.current.currentBibleRef).toBeNull();
      expect(result.current.currentSource).toBeNull();
    });
  });

  describe("navigation edge cases", () => {
    it("navigateChapter prev from chapter 1 does nothing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["verse"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      act(() => {
        result.current.navigateChapter("prev");
      });

      // Should not have made additional fetch call
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount);
      expect(result.current.currentBibleRef).toEqual({ book: "Genesis", chapter: 1 });
    });

    it("canNavigatePrev returns false for chapter 1 after loading", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["verse"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setSelectedBook("Exodus");
        result.current.setSelectedChapter(1);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.canNavigatePrev()).toBe(false);
    });

    it("canNavigateNext returns false for last chapter of book", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ he: ["verse"] }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Genesis has 50 chapters
      act(() => {
        result.current.setSelectedBook("Genesis");
        result.current.setSelectedChapter(50);
      });

      await act(async () => {
        await result.current.loadFromBible();
      });

      expect(result.current.canNavigateNext()).toBe(false);
    });
  });

  describe("syncedParagraphs edge cases", () => {
    it("handles single paragraph with translation", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("משפט בודד");
      });

      // Wait for translation to complete and state to update
      await vi.waitFor(() => {
        expect(result.current.syncedParagraphs).toHaveLength(1);
        expect(result.current.syncedParagraphs![0].english).toBe("Translation result");
      });

      expect(result.current.syncedParagraphs![0].hebrew).toBe("משפט בודד");
    });

    it("returns multiple synced paragraphs for multi-paragraph text", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("פסקה א\n\nפסקה ב\n\nפסקה ג");
      });

      // Wait for translation to complete and synced paragraphs to be computed
      await vi.waitFor(() => {
        expect(result.current.syncedParagraphs).toHaveLength(3);
      });

      expect(result.current.syncedParagraphs![0].hebrew).toBe("פסקה א");
      expect(result.current.syncedParagraphs![2].hebrew).toBe("פסקה ג");
    });
  });

  describe("bidirectional translation", () => {
    describe("translationDirection state", () => {
      it("has initial direction of hebrew-to-english", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        expect(result.current.translationDirection).toBe("hebrew-to-english");
      });
    });

    describe("setSourceText with language detection", () => {
      it("sets direction to hebrew-to-english for Hebrew input", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("שלום עולם");
        });

        expect(result.current.translationDirection).toBe("hebrew-to-english");
        expect(result.current.sourceText).toBe("שלום עולם");
      });

      it("sets direction to english-to-hebrew for English input", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("Hello world");
        });

        expect(result.current.translationDirection).toBe("english-to-hebrew");
        expect(result.current.sourceText).toBe("Hello world");
      });

      it("clears translatedText when source changes", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("Initial text");
        });

        // Change source text
        act(() => {
          result.current.setSourceText("New text");
        });

        expect(result.current.translatedText).toBe("");
      });

      it("detects mixed text with majority Hebrew as hebrew-to-english", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("שלום hello עולם טוב");
        });

        expect(result.current.translationDirection).toBe("hebrew-to-english");
      });

      it("detects mixed text with majority English as english-to-hebrew", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("Hello שלום world and more English");
        });

        expect(result.current.translationDirection).toBe("english-to-hebrew");
      });
    });

    describe("hebrewText and englishText computed values", () => {
      it("hebrewText is sourceText when direction is hebrew-to-english", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("שלום עולם");
        });

        expect(result.current.hebrewText).toBe("שלום עולם");
        expect(result.current.englishText).toBe("");
      });

      it("hebrewText is translatedText when direction is english-to-hebrew", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("Hello world");
        });

        // In english-to-hebrew, Hebrew is the translation target
        expect(result.current.sourceText).toBe("Hello world");
        expect(result.current.translationDirection).toBe("english-to-hebrew");
        // englishText should be the source
        expect(result.current.englishText).toBe("Hello world");
        // hebrewText should be empty (no translation yet)
        expect(result.current.hebrewText).toBe("");
      });
    });

    describe("setHebrewText forces hebrew-to-english direction", () => {
      it("resets direction to hebrew-to-english when setHebrewText is called", async () => {
        setupTranslationMocks();
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // First set to english-to-hebrew via setSourceText
        act(() => {
          result.current.setSourceText("Hello world");
        });
        expect(result.current.translationDirection).toBe("english-to-hebrew");

        // Now use setHebrewText which should force hebrew-to-english
        await act(async () => {
          result.current.setHebrewText("עברית");
        });

        // Wait for translation to complete
        await vi.waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        expect(result.current.translationDirection).toBe("hebrew-to-english");
        expect(result.current.hebrewText).toBe("עברית");
      });
    });

    describe("Bible loading resets to hebrew-to-english", () => {
      it("loads Bible verses as Hebrew source (hebrew-to-english direction)", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ he: ["בראשית"] }),
        } as unknown as Response);

        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // First set to english direction
        act(() => {
          result.current.setSourceText("English text");
        });
        expect(result.current.translationDirection).toBe("english-to-hebrew");

        // Load Bible
        act(() => {
          result.current.setSelectedBook("Genesis");
          result.current.setSelectedChapter(1);
        });

        await act(async () => {
          await result.current.loadFromBible();
        });

        // Should reset to hebrew-to-english
        expect(result.current.translationDirection).toBe("hebrew-to-english");
        expect(result.current.hebrewText).toContain("בראשית");
      });
    });

    describe("bookmark loading resets to hebrew-to-english", () => {
      it("loads bookmark as Hebrew source (hebrew-to-english direction)", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // First set to english direction
        act(() => {
          result.current.setSourceText("English text");
        });
        expect(result.current.translationDirection).toBe("english-to-hebrew");

        // Load bookmark
        const bookmark = {
          id: "123",
          user_id: "user-1",
          name: "Test",
          hebrew_text: "שמע ישראל",
          source: null,
          folder_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        act(() => {
          result.current.handleLoadBookmark(bookmark);
        });

        // Should reset to hebrew-to-english
        expect(result.current.translationDirection).toBe("hebrew-to-english");
        expect(result.current.hebrewText).toBe("שמע ישראל");
      });
    });

    describe("clearAll resets direction", () => {
      it("resets translationDirection to hebrew-to-english on clearAll", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // Set to english-to-hebrew
        act(() => {
          result.current.setSourceText("English text");
        });
        expect(result.current.translationDirection).toBe("english-to-hebrew");

        // Clear all
        act(() => {
          result.current.clearAll();
        });

        expect(result.current.translationDirection).toBe("hebrew-to-english");
        expect(result.current.sourceText).toBe("");
        expect(result.current.translatedText).toBe("");
      });
    });

    describe("syncedParagraphs with different directions", () => {
      it("returns null when sourceText is empty regardless of input language", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // Set and then clear English text
        act(() => {
          result.current.setSourceText("Hello");
        });
        act(() => {
          result.current.setSourceText("");
        });

        expect(result.current.syncedParagraphs).toBeNull();
      });

      it("handles empty source after direction change", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        act(() => {
          result.current.setSourceText("English text");
        });
        expect(result.current.translationDirection).toBe("english-to-hebrew");

        act(() => {
          result.current.clearAll();
        });

        expect(result.current.syncedParagraphs).toBeNull();
        expect(result.current.translationDirection).toBe("hebrew-to-english");
      });
    });

    describe("translateText action exposure", () => {
      it("exposes translateText for external callers (passage generator pattern)", async () => {
        // Mock a logged-in session (translateText requires auth)
        mockGetSession.mockResolvedValue({
          data: {
            session: {
              access_token: "test-token",
              refresh_token: "test-refresh",
              expires_in: 3600,
              token_type: "bearer",
              user: {
                id: "test-user",
                email: "test@test.com",
                aud: "authenticated",
                app_metadata: {},
                user_metadata: {},
                created_at: "",
              },
            },
          },
          error: null,
        });

        // Mock successful translation response BEFORE rendering
        // Use mockResolvedValue (not mockResolvedValueOnce) to avoid flakiness if other
        // tests have in-flight fetches that resolve during this test run.
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ translation: "This is a test" }),
        } as Response);

        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // Verify translateText is exposed
        expect(typeof result.current.translateText).toBe("function");

        // Simulate what TranslationPanel.handlePassageGenerated does
        // Note: setHebrewText now automatically triggers translation via importHebrewContent
        await act(async () => {
          result.current.setHebrewText("זוהי בדיקה");
        });

        // Translation should have been triggered
        expect(mockFetch).toHaveBeenCalled();

        // Wait for state update to propagate
        await vi.waitFor(() => {
          expect(result.current.translatedText).toBe("This is a test");
        });
      });

      it("translateText handles empty text gracefully", async () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        await act(async () => {
          await result.current.translateText("", "hebrew-to-english");
        });

        // Should not call fetch for empty text
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe("handleImageUpload guest access", () => {
      // Helper to create a mock FileReader that triggers onload asynchronously
      const createMockFileReader = (mockReadResult: string) => {
        return class MockFileReader {
          result: string | null = null;
          onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
          onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

          readAsDataURL() {
            // Use queueMicrotask to ensure onload is called after the Promise handlers are set up
            queueMicrotask(() => {
              this.result = mockReadResult;
              if (this.onload) {
                this.onload({ target: { result: mockReadResult } } as unknown as ProgressEvent<FileReader>);
              }
            });
          }
        } as unknown as typeof FileReader;
      };

      it("allows guests to upload images using anon key", async () => {
        // No session - guest mode
        mockGetSession.mockResolvedValue({
          data: { session: null },
          error: null,
        });

        // Stub anon key
        vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
        vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ hebrewText: "שלום עולם מהתמונה" }),
        } as Response);

        const originalFileReader = global.FileReader;
        global.FileReader = createMockFileReader("data:image/jpeg;base64,fakebase64data");

        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        const mockFile = new File(["fake-image-data"], "test.jpg", { type: "image/jpeg" });

        await act(async () => {
          await result.current.handleImageUpload(mockFile);
        });

        global.FileReader = originalFileReader;

        // Verify fetch was called with anon key for guest
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/gemini-translate/ocr"),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer test-anon-key",
            }),
          }),
        );

        // Verify no error occurred
        expect(result.current.error).toBe("");

        vi.unstubAllEnvs();
      });

      it("uses session token for authenticated users uploading images", async () => {
        const testToken = "authenticated-user-token";
        mockGetSession.mockResolvedValue({
          data: {
            session: {
              access_token: testToken,
              refresh_token: "test-refresh",
              expires_in: 3600,
              token_type: "bearer",
              user: {
                id: "test-user",
                email: "test@test.com",
                aud: "authenticated",
                app_metadata: {},
                user_metadata: {},
                created_at: "",
              },
            },
          },
          error: null,
        });

        vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ hebrewText: "טקסט עברי" }),
        } as Response);

        const originalFileReader = global.FileReader;
        global.FileReader = createMockFileReader("data:image/png;base64,fakebase64data");

        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        const mockFile = new File(["fake-image-data"], "test.png", { type: "image/png" });

        await act(async () => {
          await result.current.handleImageUpload(mockFile);
        });

        global.FileReader = originalFileReader;

        // Verify fetch was called with session token for authenticated user
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/gemini-translate/ocr"),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${testToken}`,
            }),
          }),
        );

        vi.unstubAllEnvs();
      });

      it("handles rate limit errors for guest image upload", async () => {
        mockGetSession.mockResolvedValue({
          data: { session: null },
          error: null,
        });

        vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
        vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: "Rate limit exceeded. Try again in 5 minutes." }),
        } as Response);

        const originalFileReader = global.FileReader;
        global.FileReader = createMockFileReader("data:image/jpeg;base64,fakebase64data");

        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        const mockFile = new File(["fake-image-data"], "test.jpg", { type: "image/jpeg" });

        await act(async () => {
          await result.current.handleImageUpload(mockFile);
        });

        global.FileReader = originalFileReader;

        expect(result.current.error).toBe("Rate limit exceeded. Try again in 5 minutes.");
        expect(result.current.processingImage).toBe(false);

        vi.unstubAllEnvs();
      });

      it("rejects non-image files", async () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        const mockFile = new File(["fake-text-data"], "test.txt", { type: "text/plain" });

        await act(async () => {
          await result.current.handleImageUpload(mockFile);
        });

        expect(result.current.error).toBe("Please upload an image file");
        expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("/ocr"), expect.anything());
      });
    });
  });

  describe("API costing and DB logging", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
      mockNotifyNewTransaction.mockClear();
      mockClearLastTransaction.mockClear();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("calls clearLastTransaction at the start of translateText", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      await vi.waitFor(() => {
        expect(mockClearLastTransaction).toHaveBeenCalled();
      });
    });

    it("calls notifyNewTransaction after a successful API translation", async () => {
      setupTranslationMocks();
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      await vi.waitFor(() => {
        expect(mockNotifyNewTransaction).toHaveBeenCalled();
      });
    });

    it("logs cache hit to api_usage_logs with zero tokens when translation is cached", async () => {
      // Set up session
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-token",
            refresh_token: "test-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: "test-user", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
          },
        },
        error: null,
      });

      // Mock translation cache hit
      const mockFrom = vi.mocked(supabase.from);
      const mockInsertFn = vi.fn().mockReturnValue({ then: vi.fn((cb: () => void) => { cb(); }) });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFrom.mockImplementation((table: string): any => {
        if (table === "translation_cache") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "cache-id", translation: "Hello" },
                }),
              }),
            }),
          };
        }
        if (table === "api_usage_logs") {
          return { insert: mockInsertFn };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          rpc: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      await vi.waitFor(() => {
        expect(mockInsertFn).toHaveBeenCalledWith(
          expect.objectContaining({
            request_type: "translate",
            endpoint: "/translate",
            prompt_tokens: 0,
            candidates_tokens: 0,
            thinking_tokens: 0,
            cache_hit: true,
            model: "cache",
          }),
        );
      });
    });

    it("calls notifyNewTransaction after logging a cache hit", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-token",
            refresh_token: "test-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: "test-user", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
          },
        },
        error: null,
      });

      const mockFrom = vi.mocked(supabase.from);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFrom.mockImplementation((table: string): any => {
        if (table === "translation_cache") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "cache-id", translation: "Hello" },
                }),
              }),
            }),
          };
        }
        if (table === "api_usage_logs") {
          return {
            insert: vi.fn().mockReturnValue({
              then: vi.fn((cb: () => void) => { cb(); }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      await vi.waitFor(() => {
        expect(mockNotifyNewTransaction).toHaveBeenCalled();
      });
    });

    it("does not log cache hit when translation cache misses and API is called", async () => {
      setupTranslationMocks();

      const mockFrom = vi.mocked(supabase.from);
      const apiUsageInserts: unknown[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFrom.mockImplementation((table: string): any => {
        if (table === "translation_cache") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        if (table === "api_usage_logs") {
          return {
            insert: vi.fn((data: unknown) => {
              apiUsageInserts.push(data);
              return { then: vi.fn((cb: () => void) => cb()) };
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setHebrewText("שלום");
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // No cache hit should be logged from the frontend
      const cacheHitLogs = apiUsageInserts.filter(
        (entry: unknown) => (entry as Record<string, unknown>).cache_hit === true,
      );
      expect(cacheHitLogs.length).toBe(0);
    });
  });

  describe("loadFromUrl error handling", () => {
    it("sets error when URL input is empty", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setUrlInput("");
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Please enter a URL");
    });

    it("sets error when URL input is only whitespace", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      await act(async () => {
        result.current.setUrlInput("   ");
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Please enter a URL");
    });

    it("sets error for invalid URL format", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("not a url");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Please enter a valid URL (e.g., https://example.com/article)");
    });

    it("sets error for URL without domain extension", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("http://example");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Please enter a valid URL (e.g., https://example.com/article)");
    });

    it("trims whitespace from URL input", async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: "Test content" }),
      } as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("  https://example.com  ");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall).toBeDefined();
      expect(fetchCall[1]).toBeDefined();
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.url).toBe("https://example.com");
    });

    it("adds https:// prefix to URLs without protocol", async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: "Test content" }),
      } as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall).toBeDefined();
      expect(fetchCall[1]).toBeDefined();
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.url).toBe("https://example.com");
    });

    it("handles 403 forbidden error", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: "This website blocks automated text extraction. Try copying and pasting the article text manually using the \"Paste / Type\" option instead." }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://blocked-site.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toContain("blocks automated text extraction");
      });
    });

    it("handles 404 not found error", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: "The page was not found. Please check the URL and try again." }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com/missing");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toBe("The page was not found. Please check the URL and try again.");
      });
    });

    it("handles 500 server error", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: "Server error while processing the URL. Please try again or use a different source." }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toContain("Server error");
      });
    });

    it("handles 502 bad gateway error", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => JSON.stringify({ error: "Server error while processing the URL. Please try again or use a different source." }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toContain("Server error");
      });
    });

    it("handles 429 rate limit with custom error message", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toBe("Rate limit exceeded. Try again later.");
      });
    });

    it("handles 400 bad request with custom error message", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: "Invalid URL format" }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toBe("Invalid URL format");
      });
    });

    it("handles network error", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockRejectedValue(new Error("Failed to fetch"));

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch");
      });
    });

    it("handles timeout error", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockRejectedValue(new Error("Request timeout"));

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error.toLowerCase()).toMatch(/time.*out|timeout/);
      });
    });

    it("handles empty content response", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: "" }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toContain("No text content could be extracted");
      });
    });

    it("handles whitespace-only content response", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: "   \n  \t  " }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.error).toContain("No text content could be extracted");
      });
    });

    it("clears error on successful URL load", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("invalid");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBeTruthy();

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: "Valid content" }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.sourceText).toBeTruthy();
      });

      expect(result.current.error).toBe("");
    });

    it("resets URL input and closes dialog on successful load", async () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: "Test content" }),
      } as Response);

      act(() => {
        result.current.setUrlInput("https://example.com");
        result.current.setShowUrlInput(true);
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      await vi.waitFor(() => {
        expect(result.current.sourceText).toBeTruthy();
      });

      expect(result.current.urlInput).toBe("");
      expect(result.current.showUrlInput).toBe(false);
    });
  });
});
