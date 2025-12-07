import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWordDefinitionPopup } from "./useWordDefinitionPopup";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";
import React from "react";

vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-id" }, access_token: "test-token" } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "word-id" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn(),
        }),
      }),
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
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

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
      const { result } = renderHook(
        () => useWordDefinitionPopup({ ...defaultProps, word: "  שלום  " }),
        { wrapper }
      );

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
  });
});
