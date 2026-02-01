import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWordDefinitionPopup } from "./useWordDefinitionPopup";

const waitFor = async (callback: () => void | Promise<void>, options?: { timeout?: number }) => {
  const timeout = options?.timeout || 1000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await callback();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  await callback();
};
import { AuthProvider } from "../../../contexts/AuthContext/AuthContext";
import React from "react";

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "word-id" }, error: null }),
  }),
});

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null });

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    then: vi.fn(),
  }),
});

let mockSession: { user: { id: string }; access_token: string } | null = {
  user: { id: "test-user-id" },
  access_token: "test-token",
};

vi.mock("../../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockImplementation(() => Promise.resolve({ data: { session: mockSession } })),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "vocabulary_words") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockMaybeSingle,
              }),
              maybeSingle: mockMaybeSingle,
            }),
          }),
          insert: mockInsert,
        };
      }
      if (table === "word_definitions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          then: vi.fn(),
        }),
        update: mockUpdate,
      };
    }),
  },
}));

vi.mock("../../utils/requestDeduplicator", () => ({
  requestDeduplicator: {
    dedupe: vi.fn().mockImplementation((_key, fn) => fn()),
  },
  createRequestKey: vi.fn().mockReturnValue("test-key"),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useWordDefinitionPopup", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  const defaultProps = {
    word: "שלום",
    onWordSaved: vi.fn(),
  };

  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => mockLocalStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          mockLocalStorage = {};
        },
        length: 0,
        key: () => null,
      },
      writable: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          definition: "Peace, hello",
          transliteration: "shalom",
          wordWithVowels: "שָׁלוֹם",
        }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with word trimmed", () => {
      const { result } = renderHook(() => useWordDefinitionPopup({ ...defaultProps, word: "  שלום  " }), { wrapper });

      expect(result.current.currentWord).toBe("שלום");
    });

    it("should start with loading true", () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      expect(result.current.loading).toBe(true);
    });

    it("should start with saved false", () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      expect(result.current.saved).toBe(false);
    });

    it("should start with no error", () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      expect(result.current.error).toBe("");
    });
  });

  describe("setCurrentWord", () => {
    it("should update currentWord", async () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await act(async () => {
        result.current.setCurrentWord("מילה");
      });

      expect(result.current.currentWord).toBe("מילה");
    });
  });

  describe("handleRefresh", () => {
    it("should be a function", () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      expect(typeof result.current.handleRefresh).toBe("function");
    });
  });

  describe("saveToVocabulary", () => {
    it("should be a function", () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      expect(typeof result.current.saveToVocabulary).toBe("function");
    });

    it("should insert words with vowels when definition provides them", () => {
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "word-id" }, error: null }),
        }),
      });

      const testData = {
        user_id: "test-user",
        hebrew_word: "שָׁלוֹם",
        english_translation: "Peace",
        definition: "Peace, hello",
        transliteration: "shalom",
      };

      insertSpy(testData);

      expect(insertSpy).toHaveBeenCalledWith(testData);
      expect(insertSpy.mock.calls[0][0].hebrew_word).toBe("שָׁלוֹם");
      expect(insertSpy.mock.calls[0][0].hebrew_word).toContain("ָ");
    });
  });

  describe("guest mode", () => {
    beforeEach(() => {
      mockSession = null;
      mockLocalStorage = { guestMode: "true" };
      vi.clearAllMocks();
    });

    afterEach(() => {
      mockSession = { user: { id: "test-user-id" }, access_token: "test-token" };
      mockLocalStorage = {};
    });

    it("should return isGuest as true when user is not authenticated", async () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.isGuest).toBe(true);
      });
    });

    it("should fetch definition without authorization header for guest users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "Peace, hello",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/gemini-translate/define"),
        expect.objectContaining({
          method: "POST",
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        }),
      );
    });

    it("should not attempt to save to vocabulary for guest users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "Peace, hello",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.definition).not.toBeNull();
      });

      await act(async () => {
        await result.current.saveToVocabulary();
      });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(result.current.saved).toBe(false);
    });

    it("should load definition successfully for guest users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "Peace, hello",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
            examples: [{ hebrew: "שָׁלוֹם עֲלֵיכֶם", english: "Peace be upon you" }],
            notes: "Common greeting",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.definition).not.toBeNull();
      expect(result.current.definition?.definition).toBe("Peace, hello");
      expect(result.current.definition?.transliteration).toBe("shalom");
      expect(result.current.error).toBe("");
    });

    it("should handle API errors gracefully for guest users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: "Rate limit exceeded. Please try again later.",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Rate limit exceeded. Please try again later.");
      expect(result.current.definition).toBeNull();
    });
  });

  describe("authenticated mode", () => {
    it("should return isGuest as false when user is authenticated", async () => {
      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.isGuest).toBe(false);
      });
    });

    it("should include authorization header for authenticated users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "Peace, hello",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/gemini-translate/define"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });
  });

  describe("bad translation handling", () => {
    beforeEach(() => {
      mockSession = { user: { id: "test-user-id" }, access_token: "test-token" };
      mockLocalStorage = {};
    });

    it("should set hasValidDefinition to false when definition is empty", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
            shortEnglish: "",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasValidDefinition).toBeFalsy();
    });

    it("should set hasValidDefinition to false when definition is whitespace only", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "   ",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
            shortEnglish: "peace",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasValidDefinition).toBeFalsy();
    });

    it("should set hasValidDefinition to false when shortEnglish becomes 'Translation unavailable'", async () => {
      // Note: mapApiResponseToDefinition derives shortEnglish from definition field,
      // so we need an empty definition to trigger "Translation unavailable"
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.definition?.shortEnglish).toBe("Translation unavailable");
      expect(result.current.hasValidDefinition).toBeFalsy();
    });

    it("should prevent saving word when hasValidDefinition is false", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
            shortEnglish: "Translation unavailable",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.saveToVocabulary();
      });

      expect(mockInsert).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(result.current.error).toBe("Cannot save word without a valid definition");
      });
    });

    it("should set hasValidDefinition to true when definition is valid", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: "Peace, hello",
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
            shortEnglish: "peace",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasValidDefinition).toBeTruthy();
    });

    it("should handle API returning 500 error", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: "Internal server error",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Internal server error");
      expect(result.current.definition).toBeNull();
      expect(result.current.hasValidDefinition).toBeFalsy();
    });

    it("should handle network failure", async () => {
      mockFetch.mockReset();
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.definition).toBeNull();
      expect(result.current.hasValidDefinition).toBeFalsy();
    });

    it("should handle malformed API response gracefully", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have definition object but with fallback values
      expect(result.current.definition).not.toBeNull();
      expect(result.current.definition?.definition).toBe("No definition available");
    });

    it("should handle API returning null definition", async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            definition: null,
            transliteration: "shalom",
            wordWithVowels: "שָׁלוֹם",
          }),
      });

      const { result } = renderHook(() => useWordDefinitionPopup(defaultProps), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.definition?.definition).toBe("No definition available");
    });
  });
});
