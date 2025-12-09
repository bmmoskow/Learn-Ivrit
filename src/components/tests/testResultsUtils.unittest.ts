import { describe, it, expect } from "vitest";
import {
  calculateScorePercentage,
  countCorrectAnswers,
  getScoreColor,
  getScoreMessage,
  getTestTypeLabel,
} from "./testResultsUtils";
import type { TestQuestion } from "../testPanelUtils";

describe("testResultsUtils", () => {
  describe("calculateScorePercentage", () => {
    it("returns 0 when total is 0", () => {
      expect(calculateScorePercentage(0, 0)).toBe(0);
    });

    it("calculates percentage correctly", () => {
      expect(calculateScorePercentage(7, 10)).toBe(70);
      expect(calculateScorePercentage(10, 10)).toBe(100);
      expect(calculateScorePercentage(1, 3)).toBe(33);
    });
  });

  describe("countCorrectAnswers", () => {
    const baseWord = {
      id: "1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "greeting",
      transliteration: "shalom",
      user_id: "user1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    it("returns 0 for empty array", () => {
      expect(countCorrectAnswers([])).toBe(0);
    });

    it("counts correct answers", () => {
      const test: TestQuestion[] = [
        { word: baseWord, isCorrect: true },
        { word: baseWord, isCorrect: false },
        { word: baseWord, isCorrect: true },
      ];
      expect(countCorrectAnswers(test)).toBe(2);
    });
  });

  describe("getScoreColor", () => {
    it("returns green for 80% or higher", () => {
      expect(getScoreColor(80)).toBe("text-green-500");
      expect(getScoreColor(100)).toBe("text-green-500");
    });

    it("returns yellow for 60-79%", () => {
      expect(getScoreColor(60)).toBe("text-yellow-500");
      expect(getScoreColor(79)).toBe("text-yellow-500");
    });

    it("returns red for below 60%", () => {
      expect(getScoreColor(59)).toBe("text-red-500");
      expect(getScoreColor(0)).toBe("text-red-500");
    });
  });

  describe("getScoreMessage", () => {
    it("returns appropriate messages for score ranges", () => {
      expect(getScoreMessage(95)).toBe("Excellent work!");
      expect(getScoreMessage(85)).toBe("Great job!");
      expect(getScoreMessage(75)).toBe("Good effort!");
      expect(getScoreMessage(65)).toBe("Keep practicing!");
      expect(getScoreMessage(50)).toBe("Don't give up!");
    });
  });

  describe("getTestTypeLabel", () => {
    it("returns correct labels for test types", () => {
      expect(getTestTypeLabel("flashcard")).toBe("Flashcard");
      expect(getTestTypeLabel("multiple_choice")).toBe("Multiple Choice");
      expect(getTestTypeLabel("fill_in_blank")).toBe("Fill in the Blank");
    });
  });
});
