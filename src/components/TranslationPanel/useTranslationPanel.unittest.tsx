import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { useTranslationPanel } from "./useTranslationPanel";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";

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

describe("useTranslationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
    it("setHebrewText updates hebrewText", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setHebrewText("שלום");
      });

      expect(result.current.hebrewText).toBe("שלום");
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

  describe("clearAll", () => {
    it("resets all text and navigation state", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      // Set some state first
      act(() => {
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

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.loadingUrl).toBe(false);
    });

    it("sets error on fetch failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Failed to load content from URL. Please check the URL and try again.");
      expect(result.current.loadingUrl).toBe(false);
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

    it("computes synced paragraphs when hebrewText is set", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setHebrewText("פסקה ראשונה\n\nפסקה שנייה");
      });

      expect(result.current.syncedParagraphs).toHaveLength(2);
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
  });
});
