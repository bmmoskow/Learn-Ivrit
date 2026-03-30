import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TranslationPanelUI } from "./TranslationPanelUI";
import { TextInputDialog } from "./TextInputDialog/TextInputDialog";
import React from "react";

const findByText = (text: string) =>
  Array.from(document.body.querySelectorAll("*")).find(
    (e) => e.textContent === text && e.children.length === 0
  ) as HTMLElement | undefined;

describe("TranslationPanelUI", () => {
  const createDefaultProps = () => ({
    hebrewText: "",
    sourceText: "",
    translatedText: "",
    translationDirection: "hebrew-to-english" as const,
    translating: false,
    error: "",
    savedWords: new Set<string>(),
    urlInput: "",
    showUrlInput: false,
    loadingUrl: false,
    selectedBook: "",
    selectedChapter: 1,
    showBibleInput: false,
    loadingBible: false,
    bibleLoaded: false,
    currentBibleRef: null,
    processingImage: false,
    isGuest: false,
    syncedParagraphs: null,
    setSourceText: vi.fn(),
    setUrlInput: vi.fn(),
    setShowUrlInput: vi.fn(),
    setSelectedBook: vi.fn(),
    setSelectedChapter: vi.fn(),
    setShowBibleInput: vi.fn(),
    setShowBookmarkManager: vi.fn(),
    setShowSaveBookmark: vi.fn(),
    setShowPassageGenerator: vi.fn(),
    loadFromUrl: vi.fn(),
    loadFromBible: vi.fn(),
    navigateChapter: vi.fn(),
    canNavigatePrev: vi.fn(() => false),
    canNavigateNext: vi.fn(() => false),
    handleWordClick: vi.fn(),
    handleCopy: vi.fn(),
    handleFileSelect: vi.fn(),
    clearAll: vi.fn(),
    triggerFileInput: vi.fn(),
    fileInputRef: { current: null } as React.RefObject<HTMLInputElement>,
  });

  describe("Empty state - InputLauncher", () => {
    it("renders InputLauncher card grid when no source text", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);
      expect(findByText("Paste or Type")).toBeTruthy();
      expect(findByText("Upload Image")).toBeTruthy();
      expect(findByText("Load from URL")).toBeTruthy();
      expect(findByText("Load from Bible")).toBeTruthy();
      expect(findByText("Generate with AI")).toBeTruthy();
    });

    it("does not show translation direction badge in empty state", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);
      expect(findByText("Hebrew → English")).toBeUndefined();
    });
  });

  describe("URL/Bible input states", () => {
    it("hides launcher when showUrlInput is true", () => {
      render(<TranslationPanelUI {...createDefaultProps()} showUrlInput={true} />);
      expect(findByText("Paste or Type")).toBeUndefined();
    });

    it("hides launcher when showBibleInput is true", () => {
      render(<TranslationPanelUI {...createDefaultProps()} showBibleInput={true} />);
      expect(findByText("Paste or Type")).toBeUndefined();
    });

    it("displays URL input with error message when error prop is set", () => {
      const errorMessage = "Unable to connect to this URL";
      render(<TranslationPanelUI {...createDefaultProps()} showUrlInput={true} error={errorMessage} />);
      const errorBox = document.querySelector(".bg-red-50");
      expect(errorBox).toBeInTheDocument();
      expect(document.body.textContent).toContain(errorMessage);
    });

    it("passes error prop to UrlInput component", () => {
      const errorMessage = "Failed to load URL";
      render(<TranslationPanelUI {...createDefaultProps()} showUrlInput={true} error={errorMessage} />);
      expect(document.body.textContent).toContain(errorMessage);
    });
  });

  describe("Translation view", () => {
    it("renders header with responsive flex classes when source text exists", () => {
      render(<TranslationPanelUI {...createDefaultProps()} sourceText="שלום" />);
      const headerContainer = document.querySelector(".flex.flex-col.sm\\:flex-row");
      expect(headerContainer).toBeInTheDocument();
    });

    it("shows translation direction badge when source text exists", () => {
      render(<TranslationPanelUI {...createDefaultProps()} sourceText="שלום" />);
      const badge = document.querySelector(".hidden.sm\\:flex");
      expect(badge).toBeInTheDocument();
    });

    it("shows toolbar when source text exists", () => {
      render(<TranslationPanelUI {...createDefaultProps()} sourceText="שלום" />);
      const iconsContainer = document.querySelector(".flex.items-center.gap-1.sm\\:gap-2");
      expect(iconsContainer).toBeInTheDocument();
    });

    it("does not show InputLauncher when source text exists", () => {
      render(<TranslationPanelUI {...createDefaultProps()} sourceText="שלום" />);
      expect(findByText("Choose how you'd like to input text")).toBeUndefined();
    });
  });

  describe("Text Input Dialog", () => {
    it("opens dialog when Paste or Type card is clicked", async () => {
      const { userEvent } = await import("@testing-library/user-event");
      const user = userEvent.setup();
      render(<TranslationPanelUI {...createDefaultProps()} />);

      const btn = findByText("Paste or Type")!;
      await user.click(btn);

      const dialog = document.body.querySelector("[role='dialog']");
      expect(dialog).toBeInTheDocument();
    });
  });
});

describe("TextInputDialog", () => {
  it("renders with white background class when open", () => {
    render(<TextInputDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const dialogContent = document.body.querySelector("[role='dialog']");
    expect(dialogContent).toHaveClass("bg-white");
  });

  it("calls onSubmit with trimmed text when Translate is clicked", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TextInputDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    const textarea = document.body.querySelector("textarea") as HTMLTextAreaElement;
    await user.type(textarea, "שלום עולם");

    const translateBtn = Array.from(document.body.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Translate"
    ) as HTMLElement;
    await user.click(translateBtn);

    expect(onSubmit).toHaveBeenCalledWith("שלום עולם");
  });

  it("disables Translate button when textarea is empty", () => {
    render(<TextInputDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const translateBtn = Array.from(document.body.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Translate"
    ) as HTMLElement;
    expect(translateBtn).toBeDisabled();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TextInputDialog open={true} onOpenChange={onOpenChange} onSubmit={vi.fn()} />);

    const cancelBtn = Array.from(document.body.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Cancel"
    ) as HTMLElement;
    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
