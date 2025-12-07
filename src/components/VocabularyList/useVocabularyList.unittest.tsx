import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVocabularyList } from "./useVocabularyList";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";
import type { ReactNode } from "react";

// Mock the Supabase client
vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          }),
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            }),
          }),
        }),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageMock.store)[index] ?? null),
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useVocabularyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    expect(result.current.words).toEqual([]);
    expect(result.current.searchQuery).toBe("");
    expect(result.current.sortBy).toBe("date");
    expect(result.current.editingId).toBeNull();
    expect(result.current.showAddForm).toBe(false);
    expect(result.current.currentPage).toBe(1);
  });

  it("updates searchQuery when setSearchQuery is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    act(() => {
      result.current.setSearchQuery("test");
    });

    expect(result.current.searchQuery).toBe("test");
  });

  it("updates sortBy when setSortBy is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    act(() => {
      result.current.setSortBy("alphabetical");
    });

    expect(result.current.sortBy).toBe("alphabetical");
  });

  it("toggles showAddForm when setShowAddForm is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    expect(result.current.showAddForm).toBe(false);

    act(() => {
      result.current.setShowAddForm(true);
    });

    expect(result.current.showAddForm).toBe(true);
  });

  it("updates newWord when setNewWord is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    act(() => {
      result.current.setNewWord({
        hebrew_word: "שלום",
        english_translation: "hello",
        definition: "greeting",
        transliteration: "shalom",
      });
    });

    expect(result.current.newWord.hebrew_word).toBe("שלום");
    expect(result.current.newWord.english_translation).toBe("hello");
  });

  it("sets editingId and editForm when startEdit is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    const mockWord = {
      id: "test-id",
      user_id: "user-1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "greeting",
      transliteration: "shalom",
      created_at: null,
      updated_at: null,
    };

    act(() => {
      result.current.startEdit(mockWord);
    });

    expect(result.current.editingId).toBe("test-id");
    expect(result.current.editForm.hebrew_word).toBe("שלום");
  });

  it("clears editingId when cancelEdit is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    const mockWord = {
      id: "test-id",
      user_id: "user-1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "greeting",
      transliteration: "shalom",
      created_at: null,
      updated_at: null,
    };

    act(() => {
      result.current.startEdit(mockWord);
    });

    expect(result.current.editingId).toBe("test-id");

    act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editingId).toBeNull();
  });

  it("updates currentPage when setCurrentPage is called", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    act(() => {
      result.current.setCurrentPage(3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it("calculates totalPages based on totalCount", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    // With totalCount of 0 (default), totalPages should be 0
    expect(result.current.totalPages).toBe(0);
  });
});
