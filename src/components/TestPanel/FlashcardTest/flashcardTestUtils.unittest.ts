import { describe, it, expect } from "vitest";
import {
  calculateProgress,
  isLastQuestion,
  getProgressBarStatus,
} from "./flashcardTestUtils";

describe("flashcardTestUtils", () => {
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

  describe("getProgressBarStatus", () => {
    it("returns 'completed' for questions before current", () => {
      expect(getProgressBarStatus(0, 3)).toBe("completed");
      expect(getProgressBarStatus(1, 3)).toBe("completed");
    });

    it("returns 'current' for current question index", () => {
      expect(getProgressBarStatus(2, 3)).toBe("current");
      expect(getProgressBarStatus(0, 1)).toBe("current");
    });

    it("returns 'pending' for questions after current", () => {
      expect(getProgressBarStatus(3, 3)).toBe("pending");
      expect(getProgressBarStatus(4, 3)).toBe("pending");
    });

    it("handles first question correctly", () => {
      expect(getProgressBarStatus(0, 1)).toBe("current");
      expect(getProgressBarStatus(1, 1)).toBe("pending");
    });

    it("handles last question correctly", () => {
      expect(getProgressBarStatus(8, 10)).toBe("completed");
      expect(getProgressBarStatus(9, 10)).toBe("current");
    });
  });
});
