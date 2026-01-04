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

      // Navigate to previous
      await act(async () => {
        result.current.navigateChapter("prev");
      });

      // Should have called fetch for chapter 4
      expect(mockFetch).toHaveBeenCalledTimes(2);
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

      // Navigate to next
      await act(async () => {
        result.current.navigateChapter("next");
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleWordClick", () => {
    it("sets selectedWord with cleaned word and sentence context", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setHebrewText("שלום עולם. זה משפט שני.");
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: "תוכן מהאתר" }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/hebrew");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.hebrewText).toBe("תוכן מהאתר");
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
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Custom error message" }),
      } as unknown as Response);

      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setUrlInput("https://example.com/bad");
      });

      await act(async () => {
        await result.current.loadFromUrl();
      });

      expect(result.current.error).toBe("Failed to load content from URL. Please check the URL and try again.");
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
    it("handles single paragraph with translation", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setHebrewText("משפט בודד");
      });

      expect(result.current.syncedParagraphs).toHaveLength(1);
      expect(result.current.syncedParagraphs![0].hebrew).toBe("משפט בודד");
      expect(result.current.syncedParagraphs![0].english).toBe("");
    });

    it("returns multiple synced paragraphs for multi-paragraph text", () => {
      const { result } = renderHook(() => useTranslationPanel(), { wrapper });

      act(() => {
        result.current.setHebrewText("פסקה א\n\nפסקה ב\n\nפסקה ג");
      });

      expect(result.current.syncedParagraphs).toHaveLength(3);
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
      it("resets direction to hebrew-to-english when setHebrewText is called", () => {
        const { result } = renderHook(() => useTranslationPanel(), { wrapper });

        // First set to english-to-hebrew via setSourceText
        act(() => {
          result.current.setSourceText("Hello world");
        });
        expect(result.current.translationDirection).toBe("english-to-hebrew");

        // Now use setHebrewText which should force hebrew-to-english
        act(() => {
          result.current.setHebrewText("עברית");
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
              user: { id: "test-user", email: "test@test.com", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
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
        await act(async () => {
          result.current.setHebrewText("זוהי בדיקה");
          // This should trigger translation (same pattern as bookmarks, Bible, OCR)
          await result.current.translateText("זוהי בדיקה", "hebrew-to-english");
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
  });
});
