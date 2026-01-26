import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TranslationPanelUI } from "./TranslationPanelUI";
import React from "react";

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

  describe("Header Responsive Layout", () => {
    it("renders header with responsive flex classes for stacking on mobile", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      // Find the header container - it should have flex-col for mobile and sm:flex-row for larger
      const headerContainer = document.querySelector(".flex.flex-col.sm\\:flex-row");
      expect(headerContainer).toBeInTheDocument();
    });

    it("renders header with proper gap for mobile spacing", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      const headerContainer = document.querySelector(".flex.flex-col.sm\\:flex-row");
      expect(headerContainer).toHaveClass("gap-3");
    });

    it("renders icon button container with compact gap for mobile", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      // Find the icons container - should have gap-1 for mobile, sm:gap-2 for larger
      const iconsContainer = document.querySelector(".flex.items-center.gap-1.sm\\:gap-2");
      expect(iconsContainer).toBeInTheDocument();
    });

    it("renders icon buttons horizontally in a flex container", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      const iconsContainer = document.querySelector(".flex.items-center.gap-1.sm\\:gap-2");
      expect(iconsContainer).toBeInTheDocument();

      // All buttons should be direct children arranged horizontally via flex
      const buttons = iconsContainer?.querySelectorAll("button");
      expect(buttons?.length).toBeGreaterThan(0);
    });

    it("renders title section with min-w-0 to prevent overflow", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      // The title container should have min-w-0 to allow text truncation if needed
      const titleContainer = document.querySelector(".flex.items-center.gap-2.sm\\:gap-4.min-w-0");
      expect(titleContainer).toBeInTheDocument();
    });
  });

  describe("Translation Direction Badge Visibility", () => {
    it("hides translation direction badge on mobile when source text exists", () => {
      const props = {
        ...createDefaultProps(),
        sourceText: "שלום",
      };
      render(<TranslationPanelUI {...props} />);

      // Badge should have hidden class for mobile, sm:flex for larger
      const badge = document.querySelector(".hidden.sm\\:flex");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Icon Button Sizing", () => {
    it("renders icon buttons with consistent p-2 padding", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      const iconsContainer = document.querySelector(".flex.items-center.gap-1.sm\\:gap-2");
      const buttons = iconsContainer?.querySelectorAll("button");

      buttons?.forEach((button) => {
        expect(button).toHaveClass("p-2");
      });
    });

    it("renders icons with w-5 h-5 size", () => {
      render(<TranslationPanelUI {...createDefaultProps()} />);

      const iconsContainer = document.querySelector(".flex.items-center.gap-1.sm\\:gap-2");
      const icons = iconsContainer?.querySelectorAll("svg");

      icons?.forEach((icon) => {
        expect(icon).toHaveClass("w-5");
        expect(icon).toHaveClass("h-5");
      });
    });
  });
});
