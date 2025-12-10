import { describe, it, expect } from "vitest";
import {
  checkMultipleChoiceAnswer,
  generateOptions,
  shuffleArray,
  calculatePoolSize,
  calculateProgress,
  isLastQuestion,
  getOptionButtonClasses,
} from "./multipleChoiceTestUtils";

describe("multipleChoiceTestUtils", () => {
  describe("checkMultipleChoiceAnswer", () => {
    it("returns true when selected option matches correct answer", () => {
      expect(checkMultipleChoiceAnswer("peace", "peace")).toBe(true);
    });

    it("returns false when selected option does not match", () => {
      expect(checkMultipleChoiceAnswer("war", "peace")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(checkMultipleChoiceAnswer("Peace", "peace")).toBe(false);
    });

    it("does not trim whitespace", () => {
      expect(checkMultipleChoiceAnswer(" peace ", "peace")).toBe(false);
    });
  });

  describe("generateOptions", () => {
    it("returns array with correct answer and distractors", () => {
      const correctAnswer = "peace";
      const allTranslations = ["peace", "war", "love", "hate", "joy", "sorrow"];
      const options = generateOptions(correctAnswer, allTranslations, 4);

      expect(options).toHaveLength(4);
      expect(options).toContain("peace");
    });

    it("does not include duplicate correct answer", () => {
      const correctAnswer = "peace";
      const allTranslations = ["peace", "war", "love", "hate"];
      const options = generateOptions(correctAnswer, allTranslations, 4);

      const correctAnswerCount = options.filter((opt) => opt === "peace").length;
      expect(correctAnswerCount).toBe(1);
    });

    it("returns only correct answer when no other translations available", () => {
      const correctAnswer = "peace";
      const allTranslations = ["peace"];
      const options = generateOptions(correctAnswer, allTranslations, 4);

      expect(options).toEqual(["peace"]);
    });

    it("handles fewer translations than requested options", () => {
      const correctAnswer = "peace";
      const allTranslations = ["peace", "war"];
      const options = generateOptions(correctAnswer, allTranslations, 4);

      expect(options).toHaveLength(2);
      expect(options).toContain("peace");
      expect(options).toContain("war");
    });

    it("generates different orders on multiple calls (probabilistic)", () => {
      const correctAnswer = "peace";
      const allTranslations = ["peace", "war", "love", "hate", "joy"];

      const options1 = generateOptions(correctAnswer, allTranslations, 4);
      const options2 = generateOptions(correctAnswer, allTranslations, 4);

      const isDifferentOrder = options1.some((opt, idx) => opt !== options2[idx]);
      expect(isDifferentOrder).toBe(true);
    });
  });

  describe("shuffleArray", () => {
    it("returns array with same length", () => {
      const input = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(input);

      expect(shuffled).toHaveLength(input.length);
    });

    it("contains all original elements", () => {
      const input = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(input);

      input.forEach((item) => {
        expect(shuffled).toContain(item);
      });
    });

    it("does not mutate original array", () => {
      const input = [1, 2, 3, 4, 5];
      const original = [...input];
      shuffleArray(input);

      expect(input).toEqual(original);
    });

    it("handles empty array", () => {
      const shuffled = shuffleArray([]);
      expect(shuffled).toEqual([]);
    });

    it("handles single element array", () => {
      const shuffled = shuffleArray([42]);
      expect(shuffled).toEqual([42]);
    });

    it("produces different orders on multiple calls (probabilistic)", () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8];
      const results = Array.from({ length: 10 }, () => shuffleArray(input));

      const allSame = results.every((result) =>
        result.every((val, idx) => val === results[0][idx])
      );

      expect(allSame).toBe(false);
    });
  });

  describe("calculatePoolSize", () => {
    it("calculates correct pool size for given questions", () => {
      expect(calculatePoolSize(10, 4)).toBe(40);
    });

    it("uses default options per question of 4", () => {
      expect(calculatePoolSize(5)).toBe(20);
    });

    it("handles zero questions", () => {
      expect(calculatePoolSize(0, 4)).toBe(0);
    });

    it("handles large numbers", () => {
      expect(calculatePoolSize(100, 4)).toBe(400);
    });
  });

  describe("calculateProgress", () => {
    it("calculates correct percentage for current question", () => {
      expect(calculateProgress(5, 10)).toBe(50);
    });

    it("returns 100 for last question", () => {
      expect(calculateProgress(10, 10)).toBe(100);
    });

    it("returns 0 for first question", () => {
      expect(calculateProgress(1, 10)).toBe(10);
    });

    it("handles total questions of 0", () => {
      expect(calculateProgress(1, 0)).toBe(0);
    });

    it("calculates decimal percentages correctly", () => {
      expect(calculateProgress(1, 3)).toBeCloseTo(33.33, 1);
    });
  });

  describe("isLastQuestion", () => {
    it("returns true when on last question", () => {
      expect(isLastQuestion(10, 10)).toBe(true);
    });

    it("returns false when not on last question", () => {
      expect(isLastQuestion(5, 10)).toBe(false);
    });

    it("returns false when question number exceeds total", () => {
      expect(isLastQuestion(11, 10)).toBe(false);
    });

    it("returns true for single question test", () => {
      expect(isLastQuestion(1, 1)).toBe(true);
    });
  });

  describe("getOptionButtonClasses", () => {
    it("returns correct classes when feedback shown and option is correct", () => {
      const classes = getOptionButtonClasses(false, true, true);
      expect(classes).toContain("border-green-600");
      expect(classes).toContain("bg-green-50");
      expect(classes).toContain("text-green-900");
    });

    it("returns correct classes when feedback shown, selected, and incorrect", () => {
      const classes = getOptionButtonClasses(true, false, true);
      expect(classes).toContain("border-red-600");
      expect(classes).toContain("bg-red-50");
      expect(classes).toContain("text-red-900");
    });

    it("returns neutral classes when feedback shown but option not selected", () => {
      const classes = getOptionButtonClasses(false, false, true);
      expect(classes).toContain("border-gray-200");
      expect(classes).toContain("bg-gray-50");
      expect(classes).toContain("text-gray-500");
    });

    it("returns hover classes when no feedback shown", () => {
      const classes = getOptionButtonClasses(false, false, false);
      expect(classes).toContain("border-gray-300");
      expect(classes).toContain("hover:border-green-500");
      expect(classes).toContain("hover:bg-green-50");
      expect(classes).toContain("cursor-pointer");
    });

    it("always includes base classes", () => {
      const classes = getOptionButtonClasses(false, false, false);
      expect(classes).toContain("w-full");
      expect(classes).toContain("p-5");
      expect(classes).toContain("text-left");
      expect(classes).toContain("text-lg");
      expect(classes).toContain("rounded-xl");
      expect(classes).toContain("border-2");
      expect(classes).toContain("transition");
    });
  });
});
