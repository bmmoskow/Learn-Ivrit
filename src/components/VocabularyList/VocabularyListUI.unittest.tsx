import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VocabularyListUI } from "./VocabularyListUI";
import type { VocabWithStats, SortBy, NewWordForm, EditForm } from "./vocabularyListUtils";

const mockWords: VocabWithStats[] = [
  {
    id: "1",
    user_id: "user-1",
    hebrew_word: "שָׁלוֹם",
    english_translation: "peace",
    transliteration: "shalom",
    definition: "peace, hello, goodbye",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    statistics: {
      id: "stat-1",
      word_id: "1",
      user_id: "user-1",
      total_attempts: 10,
      correct_count: 8,
      incorrect_count: 2,
      consecutive_correct: 3,
      confidence_score: 80,
      last_tested: "2024-01-15T00:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    },
  },
];

const defaultProps = {
  words: mockWords,
  loading: false,
  searchQuery: "",
  sortBy: "date" as SortBy,
  editingId: null,
  editForm: {
    hebrew_word: "",
    english_translation: "",
    transliteration: "",
    definition: "",
  } as EditForm,
  showAddForm: false,
  newWord: {
    hebrew_word: "",
    english_translation: "",
    transliteration: "",
    definition: "",
  } as NewWordForm,
  currentPage: 1,
  totalCount: 1,
  totalPages: 1,
  isGuest: false,
  onSearchQueryChange: () => {},
  onSortByChange: () => {},
  onShowAddFormChange: () => {},
  onNewWordChange: () => {},
  onEditFormChange: () => {},
  onCurrentPageChange: () => {},
  onAddWord: () => {},
  onStartEdit: () => {},
  onSaveEdit: () => {},
  onCancelEdit: () => {},
  onDeleteWord: () => {},
};

describe("VocabularyListUI - Guest Message", () => {
  it("should display guest message when isGuest is true", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={true} />);

    expect(screen.getByText("Example Vocabulary List")).toBeInTheDocument();
    expect(screen.getByText(/This is a sample list for Guest users/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Create a free account to build your own personalized vocabulary and track your progress/i)
    ).toBeInTheDocument();
  });

  it("should not display guest message when isGuest is false", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={false} />);

    expect(screen.queryByText("Example Vocabulary List")).not.toBeInTheDocument();
    expect(screen.queryByText(/This is a sample list for Guest users/i)).not.toBeInTheDocument();
  });

  it("should hide Add Word button for guest users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={true} />);

    expect(screen.queryByText(/Add Word/i)).not.toBeInTheDocument();
  });

  it("should show Add Word button for authenticated users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={false} />);

    const addButtons = screen.getAllByRole("button", { name: /add/i });
    const addWordButton = addButtons.find(
      (button) => button.textContent?.includes("Add Word") || button.textContent === "Add"
    );
    expect(addWordButton).toBeInTheDocument();
  });

  it("should hide Performance sort option for guest users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={true} />);

    expect(screen.queryByText("Performance")).not.toBeInTheDocument();
    expect(screen.getByText("Date Added")).toBeInTheDocument();
    expect(screen.getByText("Alphabetical")).toBeInTheDocument();
  });

  it("should show Performance sort option for authenticated users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={false} />);

    const performanceButtons = screen.getAllByText("Performance");
    expect(performanceButtons.length).toBeGreaterThan(0);
    expect(screen.getByText("Date Added")).toBeInTheDocument();
    expect(screen.getByText("Alphabetical")).toBeInTheDocument();
  });

  it("should hide action buttons (Edit/Delete) for guest users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={true} />);

    const editButtons = screen.queryAllByTitle("Edit word");
    const deleteButtons = screen.queryAllByTitle("Delete word");

    expect(editButtons).toHaveLength(0);
    expect(deleteButtons).toHaveLength(0);
  });

  it("should show action buttons (Edit/Delete) for authenticated users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={false} />);

    expect(screen.getByTitle("Edit word")).toBeInTheDocument();
    expect(screen.getByTitle("Delete word")).toBeInTheDocument();
  });

  it("should hide statistics columns for guest users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={true} />);

    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
    expect(screen.queryByText("Performance")).not.toBeInTheDocument();
  });

  it("should show statistics columns for authenticated users", () => {
    render(<VocabularyListUI {...defaultProps} isGuest={false} />);

    expect(screen.getByText("Stats")).toBeInTheDocument();
    const performanceElements = screen.getAllByText("Performance");
    expect(performanceElements.length).toBeGreaterThanOrEqual(2);
  });
});
