import { describe, it, expect } from "vitest";
import {
  createGuestWord,
  createWordWithEmptyStats,
  calculateEffectiveQuestionCount,
  calculateMaxQuestionCount,
  createTestQuestions,
  createTestResponses,
  createTestStatistics,
  calculateScorePercentage,
  countCorrectAnswers,
  updateQuestionWithAnswer,
  hasMoreQuestions,
  mapRpcWordToWordWithStats,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  TestQuestion,
} from "./testPanelUtils";
import type { WordWithStats } from "../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";

describe("testPanelUtils", () => {
  describe("createGuestWord", () => {
    it("should create a guest word with default statistics", () => {
      const word = { hebrew: "שָׁלוֹם", english: "peace" };
      const result = createGuestWord(word, 0);

      expect(result.id).toBe("guest-0");
      expect(result.user_id).toBe("guest");
      expect(result.hebrew_word).toBe("שָׁלוֹם");
      expect(result.english_translation).toBe("peace");
      expect(result.definition).toBe("peace");
      expect(result.statistics?.correct_count).toBe(0);
      expect(result.statistics?.word_id).toBe("guest-0");
    });

    it("should use index for unique IDs", () => {
      const word = { hebrew: "אַהֲבָה", english: "love" };
      const result = createGuestWord(word, 5);

      expect(result.id).toBe("guest-5");
      expect(result.statistics?.id).toBe("guest-stats-5");
    });
  });

  describe("createWordWithEmptyStats", () => {
    it("should create a word with empty statistics", () => {
      const word = {
        id: "word-123",
        user_id: "user-456",
        hebrew_word: "תּוֹדָה",
        english_translation: "thank you",
        definition: "expression of gratitude",
        transliteration: "todah",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const result = createWordWithEmptyStats(word);

      expect(result.id).toBe("word-123");
      expect(result.statistics?.correct_count).toBe(0);
      expect(result.statistics?.word_id).toBe("word-123");
      expect(result.statistics?.user_id).toBe("user-456");
    });

    it("should handle null transliteration", () => {
      const word = {
        id: "word-123",
        user_id: "user-456",
        hebrew_word: "תּוֹדָה",
        english_translation: "thank you",
        definition: "expression of gratitude",
        transliteration: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const result = createWordWithEmptyStats(word);

      expect(result.transliteration).toBe("");
    });
  });

  describe("calculateEffectiveQuestionCount", () => {
    it("should return requested count when less than available", () => {
      expect(calculateEffectiveQuestionCount(10, 50)).toBe(10);
    });

    it("should return available words when less than requested", () => {
      expect(calculateEffectiveQuestionCount(50, 10)).toBe(10);
    });

    it("should return same value when equal", () => {
      expect(calculateEffectiveQuestionCount(20, 20)).toBe(20);
    });
  });

  describe("calculateMaxQuestionCount", () => {
    it("should return MAX_QUESTIONS when words exceed it", () => {
      expect(calculateMaxQuestionCount(100)).toBe(MAX_QUESTIONS);
    });

    it("should return available words when less than MAX_QUESTIONS", () => {
      expect(calculateMaxQuestionCount(30)).toBe(30);
    });
  });

  describe("createTestQuestions", () => {
    it("should create test questions from words", () => {
      const words: WordWithStats[] = [
        createGuestWord({ hebrew: "א", english: "a" }, 0),
        createGuestWord({ hebrew: "ב", english: "b" }, 1),
      ];
      const result = createTestQuestions(words);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe(words[0]);
      expect(result[1].word).toBe(words[1]);
      expect(result[0].userAnswer).toBeUndefined();
    });

    it("should return empty array for empty words", () => {
      expect(createTestQuestions([])).toEqual([]);
    });
  });

  describe("createTestResponses", () => {
    it("should create test responses from completed test", () => {
      const questions: TestQuestion[] = [
        {
          word: createGuestWord({ hebrew: "שָׁלוֹם", english: "peace" }, 0),
          userAnswer: "peace",
          isCorrect: true,
          responseTime: 5,
        },
        {
          word: createGuestWord({ hebrew: "אַהֲבָה", english: "love" }, 1),
          userAnswer: "hate",
          isCorrect: false,
          responseTime: 3,
        },
      ];
      const result = createTestResponses(questions);

      expect(result).toHaveLength(2);
      expect(result[0].word_id).toBe("guest-0");
      expect(result[0].user_answer).toBe("peace");
      expect(result[0].correct_answer).toBe("peace");
      expect(result[0].is_correct).toBe(true);
      expect(result[0].response_time_seconds).toBe(5);
      expect(result[1].is_correct).toBe(false);
    });

    it("should handle undefined answers", () => {
      const questions: TestQuestion[] = [
        {
          word: createGuestWord({ hebrew: "שָׁלוֹם", english: "peace" }, 0),
        },
      ];
      const result = createTestResponses(questions);

      expect(result[0].user_answer).toBe("");
      expect(result[0].is_correct).toBe(false);
    });
  });

  describe("createTestStatistics", () => {
    it("should calculate updated statistics for correct answers", () => {
      const questions: TestQuestion[] = [
        {
          word: createGuestWord({ hebrew: "שָׁלוֹם", english: "peace" }, 0),
          isCorrect: true,
        },
      ];
      const mockCalcConfidence = () => 0.85;
      const timestamp = "2024-01-01T12:00:00Z";

      const result = createTestStatistics(questions, timestamp, mockCalcConfidence);

      expect(result[0].correct_count).toBe(1);
      expect(result[0].incorrect_count).toBe(0);
      expect(result[0].total_attempts).toBe(1);
      expect(result[0].consecutive_correct).toBe(1);
      expect(result[0].confidence_score).toBe(0.85);
      expect(result[0].last_tested).toBe(timestamp);
    });

    it("should reset consecutive_correct on wrong answer", () => {
      const word = createGuestWord({ hebrew: "שָׁלוֹם", english: "peace" }, 0);
      word.statistics!.consecutive_correct = 5;
      const questions: TestQuestion[] = [{ word, isCorrect: false }];
      const mockCalcConfidence = () => 0.3;

      const result = createTestStatistics(questions, "2024-01-01T12:00:00Z", mockCalcConfidence);

      expect(result[0].consecutive_correct).toBe(0);
      expect(result[0].incorrect_count).toBe(1);
    });
  });

  describe("calculateScorePercentage", () => {
    it("should calculate correct percentage", () => {
      expect(calculateScorePercentage(8, 10)).toBe(80);
      expect(calculateScorePercentage(10, 10)).toBe(100);
      expect(calculateScorePercentage(0, 10)).toBe(0);
    });

    it("should handle zero total questions", () => {
      expect(calculateScorePercentage(0, 0)).toBe(0);
    });
  });

  describe("countCorrectAnswers", () => {
    it("should count correct answers", () => {
      const questions: TestQuestion[] = [
        { word: createGuestWord({ hebrew: "א", english: "a" }, 0), isCorrect: true },
        { word: createGuestWord({ hebrew: "ב", english: "b" }, 1), isCorrect: false },
        { word: createGuestWord({ hebrew: "ג", english: "c" }, 2), isCorrect: true },
      ];

      expect(countCorrectAnswers(questions)).toBe(2);
    });

    it("should return 0 for empty array", () => {
      expect(countCorrectAnswers([])).toBe(0);
    });
  });

  describe("updateQuestionWithAnswer", () => {
    it("should update question at specified index", () => {
      const questions: TestQuestion[] = [
        { word: createGuestWord({ hebrew: "א", english: "a" }, 0) },
        { word: createGuestWord({ hebrew: "ב", english: "b" }, 1) },
      ];

      const result = updateQuestionWithAnswer(questions, 0, "a", true, 5);

      expect(result[0].userAnswer).toBe("a");
      expect(result[0].isCorrect).toBe(true);
      expect(result[0].responseTime).toBe(5);
      expect(result[1].userAnswer).toBeUndefined();
    });

    it("should not mutate original array", () => {
      const questions: TestQuestion[] = [
        { word: createGuestWord({ hebrew: "א", english: "a" }, 0) },
      ];

      const result = updateQuestionWithAnswer(questions, 0, "a", true, 5);

      expect(result).not.toBe(questions);
      expect(questions[0].userAnswer).toBeUndefined();
    });
  });

  describe("hasMoreQuestions", () => {
    it("should return true when more questions remain", () => {
      expect(hasMoreQuestions(0, 10)).toBe(true);
      expect(hasMoreQuestions(8, 10)).toBe(true);
    });

    it("should return false on last question", () => {
      expect(hasMoreQuestions(9, 10)).toBe(false);
    });
  });

  describe("mapRpcWordToWordWithStats", () => {
    it("should map stats property to statistics", () => {
      const rpcWord = {
        id: "word-123",
        hebrew_word: "שָׁלוֹם",
        stats: { correct_count: 5 },
      };

      const result = mapRpcWordToWordWithStats(rpcWord);

      expect(result.statistics).toEqual({ correct_count: 5 });
    });
  });

  describe("constants", () => {
    it("should have correct MIN_QUESTIONS", () => {
      expect(MIN_QUESTIONS).toBe(5);
    });

    it("should have correct MAX_QUESTIONS", () => {
      expect(MAX_QUESTIONS).toBe(50);
    });
  });
});
