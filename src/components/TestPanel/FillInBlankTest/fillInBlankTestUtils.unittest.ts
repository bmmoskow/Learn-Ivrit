import { describe, it, expect } from "vitest";
import { checkFillInBlankAnswer, calculateProgress, isLastQuestion, isValidInput } from "./fillInBlankTestUtils";

describe("fillInBlankTestUtils", () => {
  describe("checkFillInBlankAnswer", () => {
    it("returns true for exact match", () => {
      expect(checkFillInBlankAnswer("hello", "hello")).toBe(true);
    });

    it("returns true for case-insensitive match", () => {
      expect(checkFillInBlankAnswer("Hello", "hello")).toBe(true);
      expect(checkFillInBlankAnswer("HELLO", "hello")).toBe(true);
      expect(checkFillInBlankAnswer("hello", "HELLO")).toBe(true);
    });

    it("returns true when input has leading/trailing whitespace", () => {
      expect(checkFillInBlankAnswer("  hello  ", "hello")).toBe(true);
      expect(checkFillInBlankAnswer("\thello\n", "hello")).toBe(true);
    });

    it("returns false for non-matching answers", () => {
      expect(checkFillInBlankAnswer("hello", "world")).toBe(false);
      expect(checkFillInBlankAnswer("helo", "hello")).toBe(false);
    });

    it("returns false for empty input", () => {
      expect(checkFillInBlankAnswer("", "hello")).toBe(false);
      expect(checkFillInBlankAnswer("   ", "hello")).toBe(false);
    });

    it("handles multi-word answers", () => {
      expect(checkFillInBlankAnswer("good morning", "good morning")).toBe(true);
      expect(checkFillInBlankAnswer("Good Morning", "good morning")).toBe(true);
    });

    it("accepts any of multiple semicolon-separated translations", () => {
      const multipleTranslations = "peace; hello; goodbye";
      expect(checkFillInBlankAnswer("peace", multipleTranslations)).toBe(true);
      expect(checkFillInBlankAnswer("hello", multipleTranslations)).toBe(true);
      expect(checkFillInBlankAnswer("goodbye", multipleTranslations)).toBe(true);
      expect(checkFillInBlankAnswer("Peace", multipleTranslations)).toBe(true);
      expect(checkFillInBlankAnswer("  hello  ", multipleTranslations)).toBe(true);
    });

    it("rejects incorrect answers when multiple translations exist", () => {
      const multipleTranslations = "peace; hello; goodbye";
      expect(checkFillInBlankAnswer("hi", multipleTranslations)).toBe(false);
      expect(checkFillInBlankAnswer("peac", multipleTranslations)).toBe(false);
    });

    it("handles single translation with no semicolons", () => {
      expect(checkFillInBlankAnswer("book", "book")).toBe(true);
      expect(checkFillInBlankAnswer("books", "book")).toBe(false);
    });
  });

  describe("calculateProgress", () => {
    it("calculates correct percentage", () => {
      expect(calculateProgress(1, 10)).toBe(10);
      expect(calculateProgress(5, 10)).toBe(50);
      expect(calculateProgress(10, 10)).toBe(100);
    });

    it("returns 0 for zero total questions", () => {
      expect(calculateProgress(1, 0)).toBe(0);
    });

    it("returns 0 for negative total questions", () => {
      expect(calculateProgress(1, -5)).toBe(0);
    });

    it("handles decimal results", () => {
      expect(calculateProgress(1, 3)).toBeCloseTo(33.33, 1);
      expect(calculateProgress(2, 3)).toBeCloseTo(66.67, 1);
    });
  });

  describe("isLastQuestion", () => {
    it("returns true when question number equals total", () => {
      expect(isLastQuestion(10, 10)).toBe(true);
      expect(isLastQuestion(1, 1)).toBe(true);
    });

    it("returns false when question number is less than total", () => {
      expect(isLastQuestion(1, 10)).toBe(false);
      expect(isLastQuestion(9, 10)).toBe(false);
    });

    it("returns false when question number exceeds total", () => {
      expect(isLastQuestion(11, 10)).toBe(false);
    });
  });

  describe("isValidInput", () => {
    it("returns true for non-empty string", () => {
      expect(isValidInput("hello")).toBe(true);
      expect(isValidInput("a")).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(isValidInput("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      expect(isValidInput("   ")).toBe(false);
      expect(isValidInput("\t\n")).toBe(false);
    });

    it("returns true for string with whitespace around content", () => {
      expect(isValidInput("  hello  ")).toBe(true);
    });
  });
});
