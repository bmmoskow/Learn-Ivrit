import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  stripHtml,
  removeTrope,
  cleanWord,
  getSentenceContext,
  generateContentHash,
  syncParagraphs,
  formatBibleVerses,
  canNavigatePrev,
  canNavigateNext,
} from "./translationPanelUtils";
describe("translationPanelUtils", () => {
  describe("stripHtml", () => {
    let mockDiv: { innerHTML: string; textContent: string };

    beforeEach(() => {
      mockDiv = { innerHTML: "", textContent: "" };
      vi.spyOn(document, "createElement").mockReturnValue(mockDiv as unknown as HTMLElement);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("removes HTML tags from text", () => {
      mockDiv.textContent = "Hello World";
      const result = stripHtml("<p>Hello World</p>");
      expect(result).toBe("Hello World");
    });

    it("decodes HTML entities", () => {
      mockDiv.textContent = "Hello & World";
      const result = stripHtml("Hello &amp; World");
      expect(result).toBe("Hello & World");
    });

    it("handles empty string", () => {
      mockDiv.textContent = "";
      const result = stripHtml("");
      expect(result).toBe("");
    });

    it("removes control characters", () => {
      mockDiv.textContent = "Hello\u0000World";
      const result = stripHtml("Hello\u0000World");
      expect(result).toBe("HelloWorld");
    });
  });

  describe("removeTrope", () => {
    it("removes Hebrew cantillation marks from text", () => {
      // Text with cantillation marks (U+05B4 is a vowel, U+0591 is trope)
      const textWithTrope = "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים";
      const result = removeTrope(textWithTrope);

      // Should still contain vowels but not trope marks
      expect(result).not.toContain("\u0591"); // ETNAHTA
      expect(result).not.toContain("\u0596"); // TIPEHA
      expect(result).not.toContain("\u0594"); // ZAQEF QATAN
    });

    it("returns unchanged text when no trope marks present", () => {
      const plainText = "שלום עולם";
      expect(removeTrope(plainText)).toBe(plainText);
    });

    it("handles empty string", () => {
      expect(removeTrope("")).toBe("");
    });
  });

  describe("cleanWord", () => {
    it("removes punctuation from word", () => {
      expect(cleanWord("שלום,")).toBe("שלום");
      expect(cleanWord("!hello")).toBe("hello");
      expect(cleanWord("(test)")).toBe("test");
    });

    it("preserves Hebrew geresh and gershayim", () => {
      // These marks are significant in Hebrew
      expect(cleanWord("ג׳")).toBe("ג׳"); // geresh
      expect(cleanWord("צ״ה")).toBe("צ״ה"); // gershayim
    });

    it("trims whitespace", () => {
      expect(cleanWord("  hello  ")).toBe("hello");
    });

    it("handles empty string", () => {
      expect(cleanWord("")).toBe("");
    });
  });

  describe("getSentenceContext", () => {
    it("returns sentence containing target word", () => {
      const text = "This is first. The target word is here. Another sentence.";
      expect(getSentenceContext(text, "target")).toBe("The target word is here");
    });

    it("returns full text when word not found in specific sentence", () => {
      const text = "No matching sentence here";
      expect(getSentenceContext(text, "nomatch")).toBe(text);
    });

    it("handles Hebrew text with question marks", () => {
      const text = "מה שלומך? אני בסדר. תודה רבה!";
      expect(getSentenceContext(text, "אני")).toBe("אני בסדר");
    });

    it("handles empty text", () => {
      expect(getSentenceContext("", "word")).toBe("");
    });
  });

  describe("generateContentHash", () => {
    it("generates consistent hash for same input", async () => {
      const hash1 = await generateContentHash("שלום עולם");
      const hash2 = await generateContentHash("שלום עולם");
      expect(hash1).toBe(hash2);
    });

    it("generates different hashes for different inputs", async () => {
      const hash1 = await generateContentHash("שלום");
      const hash2 = await generateContentHash("עולם");
      expect(hash1).not.toBe(hash2);
    });

    it("returns 64 character hex string", async () => {
      const hash = await generateContentHash("test");
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it("handles empty string", async () => {
      const hash = await generateContentHash("");
      expect(hash).toHaveLength(64);
    });
  });

  describe("syncParagraphs", () => {
    it("returns null for empty Hebrew text", () => {
      expect(syncParagraphs("", "English")).toBeNull();
    });

    it("syncs Hebrew and English paragraphs correctly", () => {
      const hebrew = "פסקה ראשונה\n\nפסקה שנייה";
      const english = "First paragraph\n\nSecond paragraph";

      const result = syncParagraphs(hebrew, english);

      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({ hebrew: "פסקה ראשונה", english: "First paragraph", index: 0 });
      expect(result![1]).toEqual({ hebrew: "פסקה שנייה", english: "Second paragraph", index: 1 });
    });

    it("handles more Hebrew paragraphs than English", () => {
      const hebrew = "פסקה א\n\nפסקה ב\n\nפסקה ג";
      const english = "Para A";

      const result = syncParagraphs(hebrew, english);

      expect(result).toHaveLength(3);
      expect(result![0].english).toBe("Para A");
      expect(result![1].english).toBe("");
      expect(result![2].english).toBe("");
    });

    it("merges extra English paragraphs into last Hebrew paragraph", () => {
      const hebrew = "פסקה אחת";
      const english = "First part\n\nSecond part\n\nThird part";

      const result = syncParagraphs(hebrew, english);

      expect(result).toHaveLength(1);
      expect(result![0].english).toBe("First part\n\nSecond part\n\nThird part");
    });

    it("handles empty English text", () => {
      const hebrew = "עברית";
      const english = "";

      const result = syncParagraphs(hebrew, english);

      expect(result).toHaveLength(1);
      expect(result![0].english).toBe("");
    });
  });

  describe("formatBibleVerses", () => {
    it("formats verses with numbers", () => {
      const verses = ["בראשית", "ברא", "אלהים"];
      const result = formatBibleVerses(verses);

      expect(result).toContain("(1) בראשית");
      expect(result).toContain("(2) ברא");
      expect(result).toContain("(3) אלהים");
    });

    it("separates verses with double newlines", () => {
      const verses = ["verse1", "verse2"];
      const result = formatBibleVerses(verses);

      expect(result).toBe("(1) verse1\n\n(2) verse2");
    });

    it("handles empty array", () => {
      expect(formatBibleVerses([])).toBe("");
    });

    it("removes trope marks from verses", () => {
      const verses = ["בְּרֵאשִׁ֖ית"];
      const result = formatBibleVerses(verses);

      // Trope mark U+0596 should be removed
      expect(result).not.toContain("\u0596");
    });
  });

  describe("canNavigatePrev", () => {
    it("returns false for null ref", () => {
      expect(canNavigatePrev(null)).toBe(false);
    });

    it("returns false for chapter 1", () => {
      expect(canNavigatePrev({ book: "Genesis", chapter: 1 })).toBe(false);
    });

    it("returns true for chapter > 1", () => {
      expect(canNavigatePrev({ book: "Genesis", chapter: 5 })).toBe(true);
      expect(canNavigatePrev({ book: "Exodus", chapter: 2 })).toBe(true);
    });
  });

  describe("canNavigateNext", () => {
    const mockBooks = [
      { name: "Genesis", chapters: 50 },
      { name: "Exodus", chapters: 40 },
    ];

    it("returns false for null ref", () => {
      expect(canNavigateNext(null, mockBooks)).toBe(false);
    });

    it("returns false when at last chapter", () => {
      expect(canNavigateNext({ book: "Genesis", chapter: 50 }, mockBooks)).toBe(false);
    });

    it("returns true when not at last chapter", () => {
      expect(canNavigateNext({ book: "Genesis", chapter: 1 }, mockBooks)).toBe(true);
      expect(canNavigateNext({ book: "Genesis", chapter: 49 }, mockBooks)).toBe(true);
    });

    it("returns false for unknown book", () => {
      expect(canNavigateNext({ book: "Unknown", chapter: 1 }, mockBooks)).toBe(false);
    });
  });
});
