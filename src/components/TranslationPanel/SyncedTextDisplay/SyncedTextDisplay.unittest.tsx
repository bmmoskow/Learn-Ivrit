import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SyncedTextDisplay } from "./SyncedTextDisplay";

const createDefaultProps = () => ({
  sourceText: "שלום",
  translationDirection: "hebrew-to-english" as const,
  translating: false,
  savedWords: new Set<string>(),
  syncedParagraphs: null,
  handleWordClick: vi.fn(),
});

describe("SyncedTextDisplay", () => {
  describe("without synced paragraphs", () => {
    it("renders source text in a two-column grid", () => {
      render(<SyncedTextDisplay {...createDefaultProps()} />);
      const grid = document.querySelector(".grid.grid-cols-2");
      expect(grid).toBeInTheDocument();
      expect(document.body.textContent).toContain("שלום");
    });

    it("shows 'Translating...' placeholder when translating", () => {
      render(<SyncedTextDisplay {...createDefaultProps()} translating={true} />);
      expect(document.body.textContent).toContain("Translating...");
    });

    it("shows 'Translation will appear here...' when not translating", () => {
      render(<SyncedTextDisplay {...createDefaultProps()} />);
      expect(document.body.textContent).toContain("Translation will appear here...");
    });

    it("sets RTL direction for Hebrew source", () => {
      render(<SyncedTextDisplay {...createDefaultProps()} />);
      const rtlDiv = document.querySelector("[dir='rtl']");
      expect(rtlDiv).toBeInTheDocument();
    });
  });

  describe("with synced paragraphs", () => {
    it("renders each paragraph pair", () => {
      const props = {
        ...createDefaultProps(),
        syncedParagraphs: [
          { hebrew: "שלום", english: "Hello", index: 0 },
          { hebrew: "עולם", english: "World", index: 1 },
        ],
      };
      render(<SyncedTextDisplay {...props} />);
      const grids = document.querySelectorAll(".grid.grid-cols-2");
      expect(grids.length).toBe(2);
    });

    it("renders clickable Hebrew words", () => {
      const props = {
        ...createDefaultProps(),
        syncedParagraphs: [{ hebrew: "שלום עולם", english: "Hello world", index: 0 }],
      };
      render(<SyncedTextDisplay {...props} />);
      const clickableSpans = document.querySelectorAll(".cursor-pointer");
      expect(clickableSpans.length).toBeGreaterThan(0);
    });

    it("highlights saved words with green styling", () => {
      const props = {
        ...createDefaultProps(),
        savedWords: new Set(["שלום"]),
        syncedParagraphs: [{ hebrew: "שלום עולם", english: "Hello world", index: 0 }],
      };
      render(<SyncedTextDisplay {...props} />);
      const saved = document.querySelector(".border-green-400");
      expect(saved).toBeInTheDocument();
    });

    it("calls handleWordClick when a Hebrew word is clicked", async () => {
      const { userEvent } = await import("@testing-library/user-event");
      const user = userEvent.setup();
      const props = {
        ...createDefaultProps(),
        syncedParagraphs: [{ hebrew: "שלום", english: "Hello", index: 0 }],
      };
      render(<SyncedTextDisplay {...props} />);
      const word = document.querySelector(".cursor-pointer") as HTMLElement;
      await user.click(word);
      expect(props.handleWordClick).toHaveBeenCalled();
    });
  });
});
