import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { defaultVocabulary } from "../../data/defaultVocabulary";
import type { ReactNode } from "react";

let useVocabularyList: typeof import("./useVocabularyList").useVocabularyList;

// Use vi.hoisted to declare mocks before they're used in vi.mock factories
const { mockUseAuth, mockFrom } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

// Mock useAuth (we don't need the real AuthProvider for these hook tests)
vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

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
    from: mockFrom.mockReturnValue({
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

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

beforeAll(async () => {
  ({ useVocabularyList } = await import("./useVocabularyList"));
});

describe("useVocabularyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to non-guest user with no session
    mockUseAuth.mockReturnValue({
      user: null,
      isGuest: false,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useVocabularyList(), { wrapper });

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

  describe("Guest User - Default Vocabulary", () => {
    beforeEach(() => {
      // Mock useAuth to return guest mode
      mockUseAuth.mockReturnValue({
        user: null,
        isGuest: true,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInAsGuest: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
      });
      mockFrom.mockClear();
    });

    it("loads default vocabulary for guest users", async () => {
      const { result } = renderHook(() => useVocabularyList(), { wrapper });

      // Wait for loading to complete
      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Guest should see the default vocabulary
      expect(result.current.isGuest).toBe(true);
      expect(result.current.words.length).toBe(defaultVocabulary.length);
    });

    it("guest vocabulary contains all default words", async () => {
      const { result } = renderHook(() => useVocabularyList(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check that each default word is present
      const hebrewWords = result.current.words.map((w) => w.hebrew_word);
      for (const defaultWord of defaultVocabulary) {
        expect(hebrewWords).toContain(defaultWord.hebrew);
      }
    });

    it("guest vocabulary words have correct structure", async () => {
      const { result } = renderHook(() => useVocabularyList(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check that words have the expected structure
      const firstWord = result.current.words[0];
      expect(firstWord).toHaveProperty("id");
      expect(firstWord).toHaveProperty("hebrew_word");
      expect(firstWord).toHaveProperty("english_translation");
      expect(firstWord).toHaveProperty("definition");
      expect(firstWord).toHaveProperty("user_id", "guest");
      expect(firstWord.id).toMatch(/^guest-/);
    });

    it("guest vocabulary sets totalCount correctly", async () => {
      const { result } = renderHook(() => useVocabularyList(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalCount).toBe(defaultVocabulary.length);
    });

    it("guest vocabulary does not call Supabase", async () => {
      const { result } = renderHook(() => useVocabularyList(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Supabase.from should not be called for guests
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
