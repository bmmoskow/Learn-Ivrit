import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { VocabularyList } from "./VocabularyList";
import type { VocabularyWord } from "./vocabularyListUtils";

vi.mock("./useVocabularyList", () => ({
  useVocabularyList: vi.fn(),
}));

vi.mock("./VocabularyListUI", () => ({
  VocabularyListUI: vi.fn(() => <div data-testid="vocabulary-list-ui">Vocabulary List UI</div>),
}));

const mockWords: VocabularyWord[] = [
  {
    id: "1",
    user_id: "user-1",
    hebrew_word: "שלום",
    english_translation: "peace",
    definition: "peace",
    transliteration: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

describe("VocabularyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render VocabularyListUI with hook values", async () => {
    const mockHook = {
      words: mockWords,
      loading: false,
      searchQuery: "",
      sortBy: "date" as const,
      editingId: null,
      editForm: { hebrew_word: "", english_translation: "", definition: "" },
      showAddForm: false,
      newWord: { hebrew_word: "", english_translation: "", definition: "", transliteration: "" },
      currentPage: 1,
      totalCount: 1,
      totalPages: 1,
      isGuest: false,
      setSearchQuery: vi.fn(),
      setSortBy: vi.fn(),
      setShowAddForm: vi.fn(),
      setNewWord: vi.fn(),
      setEditForm: vi.fn(),
      setCurrentPage: vi.fn(),
      addWord: vi.fn(),
      startEdit: vi.fn(),
      saveEdit: vi.fn(),
      cancelEdit: vi.fn(),
      deleteWord: vi.fn(),
      loadVocabulary: vi.fn(),
    };

    const { useVocabularyList } = await import("./useVocabularyList");
    vi.mocked(useVocabularyList).mockReturnValue(mockHook);

    const { getByTestId } = render(<VocabularyList />);
    expect(getByTestId("vocabulary-list-ui")).toBeInTheDocument();
  });

  it("should pass all props to VocabularyListUI", async () => {
    const mockHook = {
      words: mockWords,
      loading: true,
      searchQuery: "test",
      sortBy: "alphabetical" as const,
      editingId: "1",
      editForm: { hebrew_word: "שלום", english_translation: "peace", definition: "peace" },
      showAddForm: true,
      newWord: { hebrew_word: "חדש", english_translation: "new", definition: "new", transliteration: "" },
      currentPage: 2,
      totalCount: 50,
      totalPages: 5,
      isGuest: true,
      setSearchQuery: vi.fn(),
      setSortBy: vi.fn(),
      setShowAddForm: vi.fn(),
      setNewWord: vi.fn(),
      setEditForm: vi.fn(),
      setCurrentPage: vi.fn(),
      addWord: vi.fn(),
      startEdit: vi.fn(),
      saveEdit: vi.fn(),
      cancelEdit: vi.fn(),
      deleteWord: vi.fn(),
      loadVocabulary: vi.fn(),
    };

    const { useVocabularyList } = await import("./useVocabularyList");
    const { VocabularyListUI } = await import("./VocabularyListUI");
    vi.mocked(useVocabularyList).mockReturnValue(mockHook);

    render(<VocabularyList />);

    expect(VocabularyListUI).toHaveBeenCalledWith(
      expect.objectContaining({
        words: mockWords,
        loading: true,
        searchQuery: "test",
        sortBy: "alphabetical",
        editingId: "1",
        showAddForm: true,
        currentPage: 2,
        totalCount: 50,
        totalPages: 5,
        isGuest: true,
      }),
      {}
    );
  });

  it("should pass event handlers to VocabularyListUI", async () => {
    const mockHandlers = {
      words: [],
      loading: false,
      searchQuery: "",
      sortBy: "date" as const,
      editingId: null,
      editForm: { hebrew_word: "", english_translation: "", definition: "" },
      showAddForm: false,
      newWord: { hebrew_word: "", english_translation: "", definition: "", transliteration: "" },
      currentPage: 1,
      totalCount: 0,
      totalPages: 0,
      isGuest: false,
      setSearchQuery: vi.fn(),
      setSortBy: vi.fn(),
      setShowAddForm: vi.fn(),
      setNewWord: vi.fn(),
      setEditForm: vi.fn(),
      setCurrentPage: vi.fn(),
      addWord: vi.fn(),
      startEdit: vi.fn(),
      saveEdit: vi.fn(),
      cancelEdit: vi.fn(),
      deleteWord: vi.fn(),
      loadVocabulary: vi.fn(),
    };

    const { useVocabularyList } = await import("./useVocabularyList");
    const { VocabularyListUI } = await import("./VocabularyListUI");
    vi.mocked(useVocabularyList).mockReturnValue(mockHandlers);

    render(<VocabularyList />);

    expect(VocabularyListUI).toHaveBeenCalledWith(
      expect.objectContaining({
        onSearchQueryChange: mockHandlers.setSearchQuery,
        onSortByChange: mockHandlers.setSortBy,
        onShowAddFormChange: mockHandlers.setShowAddForm,
        onNewWordChange: mockHandlers.setNewWord,
        onEditFormChange: mockHandlers.setEditForm,
        onCurrentPageChange: mockHandlers.setCurrentPage,
        onAddWord: mockHandlers.addWord,
        onStartEdit: mockHandlers.startEdit,
        onSaveEdit: mockHandlers.saveEdit,
        onCancelEdit: mockHandlers.cancelEdit,
        onDeleteWord: mockHandlers.deleteWord,
      }),
      {}
    );
  });
});
