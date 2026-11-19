import { describe, it, expect } from "vitest";
import {
  canGoNext,
  canGoPrevious,
  getNextIndex,
  getPreviousIndex,
  getProgressBarStatus,
  getRevealText,
  REVIEW_WORD_COUNT,
} from "./flashcardReviewUtils";
import type { WordWithStats } from "../../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";

describe("flashcardReviewUtils", () => {
  describe("canGoPrevious", () => {
    it("returns false on the first card", () => {
      expect(canGoPrevious(0)).toBe(false);
    });

    it("returns true once past the first card", () => {
      expect(canGoPrevious(1)).toBe(true);
      expect(canGoPrevious(5)).toBe(true);
    });
  });

  describe("canGoNext", () => {
    it("returns true when there are more cards ahead", () => {
      expect(canGoNext(0, 5)).toBe(true);
      expect(canGoNext(3, 5)).toBe(true);
    });

    it("returns false on the last card", () => {
      expect(canGoNext(4, 5)).toBe(false);
    });

    it("returns false for an empty deck", () => {
      expect(canGoNext(0, 0)).toBe(false);
    });
  });

  describe("getNextIndex", () => {
    it("advances by one", () => {
      expect(getNextIndex(0, 5)).toBe(1);
    });

    it("clamps at the last card", () => {
      expect(getNextIndex(4, 5)).toBe(4);
    });
  });

  describe("getPreviousIndex", () => {
    it("steps back by one", () => {
      expect(getPreviousIndex(3)).toBe(2);
    });

    it("clamps at the first card", () => {
      expect(getPreviousIndex(0)).toBe(0);
    });
  });

  describe("getProgressBarStatus", () => {
    it("marks earlier cards completed", () => {
      expect(getProgressBarStatus(0, 2)).toBe("completed");
      expect(getProgressBarStatus(1, 2)).toBe("completed");
    });

    it("marks the current card", () => {
      expect(getProgressBarStatus(2, 2)).toBe("current");
    });

    it("marks later cards pending", () => {
      expect(getProgressBarStatus(3, 2)).toBe("pending");
    });
  });

  describe("getRevealText", () => {
    const baseWord: WordWithStats = {
      id: "1",
      user_id: "user-1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "a greeting",
      transliteration: "shalom",
      created_at: null,
      updated_at: null,
    };

    it("prefers the english translation", () => {
      expect(getRevealText(baseWord)).toBe("hello");
    });

    it("falls back to the definition when there is no translation", () => {
      expect(getRevealText({ ...baseWord, english_translation: "" })).toBe("a greeting");
    });

    it("returns an empty string when nothing is available", () => {
      expect(getRevealText({ ...baseWord, english_translation: "", definition: "" })).toBe("");
    });
  });

  describe("REVIEW_WORD_COUNT", () => {
    it("is a positive session size", () => {
      expect(REVIEW_WORD_COUNT).toBeGreaterThan(0);
    });
  });
});
