import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TranslationPanel } from "./TranslationPanel";
import type { User } from "@supabase/supabase-js";

vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./useTranslationPanel", () => ({
  useTranslationPanel: vi.fn(),
}));

vi.mock("./TranslationPanelUI", () => ({
  TranslationPanelUI: vi.fn(() => <div data-testid="translation-panel-ui">Translation Panel UI</div>),
}));

vi.mock("./WordDefinitionPopup/WordDefinitionPopup", () => ({
  WordDefinitionPopup: vi.fn(() => <div data-testid="word-definition-popup">Word Definition Popup</div>),
}));

vi.mock("./BookmarkManager/BookmarkManager", () => ({
  BookmarkManager: vi.fn(() => <div data-testid="bookmark-manager">Bookmark Manager</div>),
}));

vi.mock("./SaveBookmarkDialog/SaveBookmarkDialog", () => ({
  SaveBookmarkDialog: vi.fn(() => <div data-testid="save-bookmark-dialog">Save Bookmark Dialog</div>),
}));

vi.mock("./PassageGenerator/PassageGenerator", () => ({
  PassageGenerator: vi.fn(() => <div data-testid="passage-generator">Passage Generator</div>),
}));

const mockUser: User = {
  id: "test-user-id",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
};

describe("TranslationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render TranslationPanelUI", async () => {
    const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
    const { useTranslationPanel } = await import("./useTranslationPanel");

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isGuest: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });

    vi.mocked(useTranslationPanel).mockReturnValue({
      hebrewText: "",
      englishText: "",
      sourceText: "",
      translatedText: "",
      translationDirection: "hebrew-to-english",
      translating: false,
      error: "",
      savedWords: new Set<string>(),
      urlInput: "",
      showUrlInput: false,
      loadingUrl: false,
      selectedBook: "",
      selectedChapter: 0,
      showBibleInput: false,
      loadingBible: false,
      bibleLoaded: false,
      currentBibleRef: { book: "", chapter: 0 },
      processingImage: false,
      syncedParagraphs: null,
      selectedWord: null,
      showBookmarkManager: false,
      showSaveBookmark: false,
      currentSource: null,
      setHebrewText: vi.fn(),
      setSourceText: vi.fn(),
      setUrlInput: vi.fn(),
      setShowUrlInput: vi.fn(),
      setSelectedBook: vi.fn(),
      setSelectedChapter: vi.fn(),
      setShowBibleInput: vi.fn(),
      setSelectedWord: vi.fn(),
      setShowBookmarkManager: vi.fn(),
      setShowSaveBookmark: vi.fn(),
      translateText: vi.fn(),
      loadFromUrl: vi.fn(),
      loadFromBible: vi.fn(),
      navigateChapter: vi.fn(),
      canNavigatePrev: () => false,
      canNavigateNext: () => false,
      handleWordClick: vi.fn(),
      handleCopy: vi.fn(),
      handleFileSelect: vi.fn(),
      handleImageUpload: vi.fn(),
      clearAll: vi.fn(),
      triggerFileInput: vi.fn(),
      fileInputRef: { current: null },
      loadSavedWords: vi.fn(),
      handleLoadBookmark: vi.fn(),
    });

    render(<TranslationPanel />);
    expect(screen.getByTestId("translation-panel-ui")).toBeInTheDocument();
  });

  it("should render WordDefinitionPopup when word is selected", async () => {
    const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
    const { useTranslationPanel } = await import("./useTranslationPanel");

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isGuest: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });

    vi.mocked(useTranslationPanel).mockReturnValue({
      hebrewText: "",
      sourceText: "",
      translatedText: "",
      translationDirection: "hebrew-to-english",
      translating: false,
      error: "",
      savedWords: new Set<string>(),
      urlInput: "",
      showUrlInput: false,
      loadingUrl: false,
      selectedBook: "",
      selectedChapter: 0,
      showBibleInput: false,
      loadingBible: false,
      bibleLoaded: false,
      currentBibleRef: { book: "", chapter: 0 },
      processingImage: false,
      syncedParagraphs: null,
      selectedWord: { word: "שלום", sentence: "שלום לך", position: { x: 100, y: 100 } },
      showBookmarkManager: false,
      showSaveBookmark: false,
      currentSource: null,
      englishText: "",
      setHebrewText: vi.fn(),
      setSourceText: vi.fn(),
      setUrlInput: vi.fn(),
      setShowUrlInput: vi.fn(),
      setSelectedBook: vi.fn(),
      setSelectedChapter: vi.fn(),
      setShowBibleInput: vi.fn(),
      setSelectedWord: vi.fn(),
      setShowBookmarkManager: vi.fn(),
      setShowSaveBookmark: vi.fn(),
      translateText: vi.fn(),
      loadFromUrl: vi.fn(),
      loadFromBible: vi.fn(),
      navigateChapter: vi.fn(),
      canNavigatePrev: () => false,
      canNavigateNext: () => false,
      handleWordClick: vi.fn(),
      handleCopy: vi.fn(),
      handleFileSelect: vi.fn(),
      handleImageUpload: vi.fn(),
      clearAll: vi.fn(),
      triggerFileInput: vi.fn(),
      fileInputRef: { current: null },
      loadSavedWords: vi.fn(),
      handleLoadBookmark: vi.fn(),
    });

    render(<TranslationPanel />);
    expect(screen.getByTestId("word-definition-popup")).toBeInTheDocument();
  });

  it("should not render WordDefinitionPopup when no word is selected", async () => {
    const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
    const { useTranslationPanel } = await import("./useTranslationPanel");

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isGuest: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });

    vi.mocked(useTranslationPanel).mockReturnValue({
      hebrewText: "",
      englishText: "",
      sourceText: "",
      translatedText: "",
      translationDirection: "hebrew-to-english",
      translating: false,
      error: "",
      savedWords: new Set<string>(),
      urlInput: "",
      showUrlInput: false,
      loadingUrl: false,
      selectedBook: "",
      selectedChapter: 0,
      showBibleInput: false,
      loadingBible: false,
      bibleLoaded: false,
      currentBibleRef: { book: "", chapter: 0 },
      processingImage: false,
      syncedParagraphs: null,
      selectedWord: null,
      showBookmarkManager: false,
      showSaveBookmark: false,
      currentSource: null,
      setHebrewText: vi.fn(),
      setSourceText: vi.fn(),
      setUrlInput: vi.fn(),
      setShowUrlInput: vi.fn(),
      setSelectedBook: vi.fn(),
      setSelectedChapter: vi.fn(),
      setShowBibleInput: vi.fn(),
      setSelectedWord: vi.fn(),
      setShowBookmarkManager: vi.fn(),
      setShowSaveBookmark: vi.fn(),
      translateText: vi.fn(),
      loadFromUrl: vi.fn(),
      loadFromBible: vi.fn(),
      navigateChapter: vi.fn(),
      canNavigatePrev: () => false,
      canNavigateNext: () => false,
      handleWordClick: vi.fn(),
      handleCopy: vi.fn(),
      handleFileSelect: vi.fn(),
      handleImageUpload: vi.fn(),
      clearAll: vi.fn(),
      triggerFileInput: vi.fn(),
      fileInputRef: { current: null },
      loadSavedWords: vi.fn(),
      handleLoadBookmark: vi.fn(),
    });

    render(<TranslationPanel />);
    expect(screen.queryByTestId("word-definition-popup")).not.toBeInTheDocument();
  });

  it("should render BookmarkManager when showBookmarkManager is true", async () => {
    const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
    const { useTranslationPanel } = await import("./useTranslationPanel");

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isGuest: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });

    vi.mocked(useTranslationPanel).mockReturnValue({
      hebrewText: "",
      sourceText: "",
      translatedText: "",
      translationDirection: "hebrew-to-english",
      translating: false,
      error: "",
      savedWords: new Set<string>(),
      urlInput: "",
      showUrlInput: false,
      loadingUrl: false,
      selectedBook: "",
      selectedChapter: 0,
      showBibleInput: false,
      loadingBible: false,
      bibleLoaded: false,
      currentBibleRef: { book: "", chapter: 0 },
      processingImage: false,
      syncedParagraphs: null,
      selectedWord: null,
      showBookmarkManager: true,
      showSaveBookmark: false,
      currentSource: null,
      englishText: "",
      setHebrewText: vi.fn(),
      setSourceText: vi.fn(),
      setUrlInput: vi.fn(),
      setShowUrlInput: vi.fn(),
      setSelectedBook: vi.fn(),
      setSelectedChapter: vi.fn(),
      setShowBibleInput: vi.fn(),
      setSelectedWord: vi.fn(),
      setShowBookmarkManager: vi.fn(),
      setShowSaveBookmark: vi.fn(),
      translateText: vi.fn(),
      loadFromUrl: vi.fn(),
      loadFromBible: vi.fn(),
      navigateChapter: vi.fn(),
      canNavigatePrev: () => false,
      canNavigateNext: () => false,
      handleWordClick: vi.fn(),
      handleCopy: vi.fn(),
      handleFileSelect: vi.fn(),
      handleImageUpload: vi.fn(),
      clearAll: vi.fn(),
      triggerFileInput: vi.fn(),
      fileInputRef: { current: null },
      loadSavedWords: vi.fn(),
      handleLoadBookmark: vi.fn(),
    });

    render(<TranslationPanel />);
    expect(screen.getByTestId("bookmark-manager")).toBeInTheDocument();
  });

  it("should render SaveBookmarkDialog when showSaveBookmark is true", async () => {
    const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
    const { useTranslationPanel } = await import("./useTranslationPanel");

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isGuest: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });

    vi.mocked(useTranslationPanel).mockReturnValue({
      hebrewText: "שלום",
      englishText: "",
      sourceText: "",
      translatedText: "",
      translationDirection: "hebrew-to-english",
      translating: false,
      error: "",
      savedWords: new Set<string>(),
      urlInput: "",
      showUrlInput: false,
      loadingUrl: false,
      selectedBook: "",
      selectedChapter: 0,
      showBibleInput: false,
      loadingBible: false,
      bibleLoaded: false,
      currentBibleRef: { book: "", chapter: 0 },
      processingImage: false,
      syncedParagraphs: null,
      selectedWord: null,
      showBookmarkManager: false,
      showSaveBookmark: true,
      currentSource: "Bible",
      setHebrewText: vi.fn(),
      setSourceText: vi.fn(),
      setUrlInput: vi.fn(),
      setShowUrlInput: vi.fn(),
      setSelectedBook: vi.fn(),
      setSelectedChapter: vi.fn(),
      setShowBibleInput: vi.fn(),
      setSelectedWord: vi.fn(),
      setShowBookmarkManager: vi.fn(),
      setShowSaveBookmark: vi.fn(),
      translateText: vi.fn(),
      loadFromUrl: vi.fn(),
      loadFromBible: vi.fn(),
      navigateChapter: vi.fn(),
      canNavigatePrev: () => false,
      canNavigateNext: () => false,
      handleWordClick: vi.fn(),
      handleCopy: vi.fn(),
      handleFileSelect: vi.fn(),
      handleImageUpload: vi.fn(),
      clearAll: vi.fn(),
      triggerFileInput: vi.fn(),
      fileInputRef: { current: null },
      loadSavedWords: vi.fn(),
      handleLoadBookmark: vi.fn(),
    });

    render(<TranslationPanel />);
    expect(screen.getByTestId("save-bookmark-dialog")).toBeInTheDocument();
  });

  it("should pass isGuest prop to TranslationPanelUI", async () => {
    const { useAuth } = await import("../../contexts/AuthContext/AuthContext");
    const { useTranslationPanel } = await import("./useTranslationPanel");
    const { TranslationPanelUI } = await import("./TranslationPanelUI");

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isGuest: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });

    vi.mocked(useTranslationPanel).mockReturnValue({
      hebrewText: "",
      englishText: "",
      sourceText: "",
      translatedText: "",
      translationDirection: "hebrew-to-english",
      translating: false,
      error: "",
      savedWords: new Set<string>(),
      urlInput: "",
      showUrlInput: false,
      loadingUrl: false,
      selectedBook: "",
      selectedChapter: 0,
      showBibleInput: false,
      loadingBible: false,
      bibleLoaded: false,
      currentBibleRef: { book: "", chapter: 0 },
      processingImage: false,
      syncedParagraphs: null,
      selectedWord: null,
      showBookmarkManager: false,
      showSaveBookmark: false,
      currentSource: null,
      setHebrewText: vi.fn(),
      setSourceText: vi.fn(),
      setUrlInput: vi.fn(),
      setShowUrlInput: vi.fn(),
      setSelectedBook: vi.fn(),
      setSelectedChapter: vi.fn(),
      setShowBibleInput: vi.fn(),
      setSelectedWord: vi.fn(),
      setShowBookmarkManager: vi.fn(),
      setShowSaveBookmark: vi.fn(),
      translateText: vi.fn(),
      loadFromUrl: vi.fn(),
      loadFromBible: vi.fn(),
      navigateChapter: vi.fn(),
      canNavigatePrev: () => false,
      canNavigateNext: () => false,
      handleWordClick: vi.fn(),
      handleCopy: vi.fn(),
      handleFileSelect: vi.fn(),
      handleImageUpload: vi.fn(),
      clearAll: vi.fn(),
      triggerFileInput: vi.fn(),
      fileInputRef: { current: null },
      loadSavedWords: vi.fn(),
      handleLoadBookmark: vi.fn(),
    });

    render(<TranslationPanel />);

    expect(TranslationPanelUI).toHaveBeenCalledWith(
      expect.objectContaining({
        isGuest: true,
      }),
      {}
    );
  });
});
