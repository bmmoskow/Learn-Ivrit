import { describe, it, expect } from "vitest";
import {
  calculateStudyStreak,
  formatTestType,
  formatDate,
  calculateAverageScore,
  transformWeakWordsData,
} from "./useDashboard";
import type { Tables } from "../../../supabase/types";

type UserTest = Tables<"user_tests">;

const createMockTest = (overrides: Partial<UserTest> = {}): UserTest => ({
  id: "test-1",
  user_id: "user-1",
  test_type: "flashcard",
  total_questions: 10,
  correct_answers: 8,
  score_percentage: 80,
  duration_seconds: 120,
  completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

describe("calculateStudyStreak", () => {
  it("returns 0 for empty tests array", () => {
    expect(calculateStudyStreak([])).toBe(0);
  });

  it("returns 1 for a test completed today", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const tests = [createMockTest({ completed_at: "2024-06-15T10:00:00Z" })];
    expect(calculateStudyStreak(tests, today)).toBe(1);
  });

  it("returns 0 if no test was completed today", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const tests = [createMockTest({ completed_at: "2024-06-13T10:00:00Z" })];
    expect(calculateStudyStreak(tests, today)).toBe(0);
  });

  it("returns consecutive days streak", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const tests = [
      createMockTest({ id: "1", completed_at: "2024-06-15T10:00:00Z" }),
      createMockTest({ id: "2", completed_at: "2024-06-14T10:00:00Z" }),
      createMockTest({ id: "3", completed_at: "2024-06-13T10:00:00Z" }),
    ];
    expect(calculateStudyStreak(tests, today)).toBe(3);
  });

  it("breaks streak when a day is missed", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const tests = [
      createMockTest({ id: "1", completed_at: "2024-06-15T10:00:00Z" }),
      createMockTest({ id: "2", completed_at: "2024-06-14T10:00:00Z" }),
      // Gap on 13th
      createMockTest({ id: "3", completed_at: "2024-06-12T10:00:00Z" }),
    ];
    expect(calculateStudyStreak(tests, today)).toBe(2);
  });

  it("counts multiple tests on the same day as one day", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const tests = [
      createMockTest({ id: "1", completed_at: "2024-06-15T10:00:00Z" }),
      createMockTest({ id: "2", completed_at: "2024-06-15T14:00:00Z" }),
      createMockTest({ id: "3", completed_at: "2024-06-14T10:00:00Z" }),
    ];
    expect(calculateStudyStreak(tests, today)).toBe(2);
  });
});

describe("formatTestType", () => {
  it("formats single word type", () => {
    expect(formatTestType("flashcard")).toBe("Flashcard");
  });

  it("formats underscore-separated type", () => {
    expect(formatTestType("multiple_choice")).toBe("Multiple Choice");
  });

  it("formats fill_in_blank type", () => {
    expect(formatTestType("fill_in_blank")).toBe("Fill In Blank");
  });

  it("handles empty string", () => {
    expect(formatTestType("")).toBe("");
  });
});

describe("formatDate", () => {
  it("returns 'Just now' for less than 1 hour ago", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const date = "2024-06-15T11:30:00Z";
    expect(formatDate(date, now)).toBe("Just now");
  });

  it("returns hours ago for less than 24 hours", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const date = "2024-06-15T08:00:00Z";
    expect(formatDate(date, now)).toBe("4h ago");
  });

  it("returns days ago for less than 7 days", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const date = "2024-06-12T12:00:00Z";
    expect(formatDate(date, now)).toBe("3d ago");
  });

  it("returns formatted date for 7 or more days", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const date = "2024-06-01T12:00:00Z";
    const result = formatDate(date, now);
    // The exact format depends on locale, but should include date parts
    expect(result).not.toBe("Just now");
    expect(result).not.toContain("h ago");
    expect(result).not.toContain("d ago");
  });
});

describe("calculateAverageScore", () => {
  it("returns 0 for empty tests array", () => {
    expect(calculateAverageScore([])).toBe(0);
  });

  it("calculates average of single test", () => {
    const tests = [createMockTest({ score_percentage: 80 })];
    expect(calculateAverageScore(tests)).toBe(80);
  });

  it("calculates average of multiple tests", () => {
    const tests = [
      createMockTest({ id: "1", score_percentage: 80 }),
      createMockTest({ id: "2", score_percentage: 60 }),
      createMockTest({ id: "3", score_percentage: 100 }),
    ];
    expect(calculateAverageScore(tests)).toBe(80);
  });

  it("rounds to nearest integer", () => {
    const tests = [
      createMockTest({ id: "1", score_percentage: 70 }),
      createMockTest({ id: "2", score_percentage: 80 }),
    ];
    expect(calculateAverageScore(tests)).toBe(75);
  });
});

describe("transformWeakWordsData", () => {
  it("returns empty array for null input", () => {
    expect(transformWeakWordsData(null)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(transformWeakWordsData([])).toEqual([]);
  });

  it("filters out items without vocabulary_words", () => {
    const data = [
      {
        id: "stat-1",
        user_id: "user-1",
        word_id: "word-1",
        correct_count: 5,
        incorrect_count: 2,
        total_attempts: 7,
        consecutive_correct: 3,
        last_tested: "2024-06-15T10:00:00Z",
        confidence_score: 70,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
        vocabulary_words: null,
      },
    ];
    expect(transformWeakWordsData(data)).toEqual([]);
  });

  it("transforms data with vocabulary_words object", () => {
    const vocabWord = {
      id: "word-1",
      user_id: "user-1",
      hebrew_word: "שלום",
      english_translation: "peace",
      definition: "A greeting",
      transliteration: "shalom",
      created_at: "2024-06-01T00:00:00Z",
      updated_at: "2024-06-15T10:00:00Z",
    };
    const data = [
      {
        id: "stat-1",
        user_id: "user-1",
        word_id: "word-1",
        correct_count: 5,
        incorrect_count: 2,
        total_attempts: 7,
        consecutive_correct: 3,
        last_tested: "2024-06-15T10:00:00Z",
        confidence_score: 70,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
        vocabulary_words: vocabWord,
      },
    ];

    const result = transformWeakWordsData(data);
    expect(result).toHaveLength(1);
    expect(result[0].hebrew_word).toBe("שלום");
    expect(result[0].statistics.confidence_score).toBe(70);
    expect(result[0].statistics.correct_count).toBe(5);
  });

  it("transforms data with vocabulary_words array", () => {
    const vocabWord = {
      id: "word-1",
      user_id: "user-1",
      hebrew_word: "תודה",
      english_translation: "thank you",
      definition: "Expression of gratitude",
      transliteration: "toda",
      created_at: "2024-06-01T00:00:00Z",
      updated_at: "2024-06-15T10:00:00Z",
    };
    const data = [
      {
        id: "stat-1",
        user_id: "user-1",
        word_id: "word-1",
        correct_count: 10,
        incorrect_count: 0,
        total_attempts: 10,
        consecutive_correct: 10,
        last_tested: "2024-06-15T10:00:00Z",
        confidence_score: 100,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
        vocabulary_words: [vocabWord],
      },
    ];

    const result = transformWeakWordsData(data);
    expect(result).toHaveLength(1);
    expect(result[0].hebrew_word).toBe("תודה");
    expect(result[0].statistics.confidence_score).toBe(100);
  });
});
