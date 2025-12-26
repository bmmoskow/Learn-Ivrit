import { describe, it, expect, vi } from "vitest";
import {
  calculateWeight,
  createWeightedWords,
  sortWeightedWordsByWeight,
  calculateTotalWeight,
  selectWeightedWordByRandom,
  selectTestWords,
  calculateConfidenceScore,
  shuffleArray,
  type WordWithStats,
  type WeightedWord,
} from "./adaptiveAlgorithmUtils";

describe("adaptiveAlgorithmUtils", () => {
  const createMockWord = (
    id: string,
    stats?: Partial<{
      total_attempts: number;
      incorrect_count: number;
      correct_count: number;
      consecutive_correct: number;
      last_tested: string | null;
      confidence_score: number;
    }>
  ): WordWithStats => ({
    id,
    user_id: "user-1",
    hebrew_word: "שלום",
    english_translation: "hello",
    definition: "greeting",
    transliteration: "shalom",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    statistics: stats
      ? {
          id: `stats-${id}`,
          user_id: "user-1",
          word_id: id,
          correct_count: stats.correct_count ?? 0,
          incorrect_count: stats.incorrect_count ?? 0,
          total_attempts: stats.total_attempts ?? 0,
          consecutive_correct: stats.consecutive_correct ?? 0,
          last_tested: stats.last_tested ?? null,
          confidence_score: stats.confidence_score ?? 0,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        }
      : undefined,
  });

  describe("calculateWeight", () => {
    it("returns 100 for new words without statistics", () => {
      const word = createMockWord("word-1");
      expect(calculateWeight(word)).toBe(100);
    });

    it("returns 100 for words with zero attempts", () => {
      const word = createMockWord("word-1", { total_attempts: 0 });
      expect(calculateWeight(word)).toBe(100);
    });

    it("returns 10 for mastered words (5+ consecutive correct)", () => {
      const word = createMockWord("word-1", {
        total_attempts: 5,
        correct_count: 5,
        incorrect_count: 0,
        consecutive_correct: 5,
        confidence_score: 100,
      });
      expect(calculateWeight(word)).toBe(10);
    });

    it("calculates higher weight for words with high error rate", () => {
      const lowErrorWord = createMockWord("word-1", {
        total_attempts: 10,
        correct_count: 9,
        incorrect_count: 1,
        consecutive_correct: 2,
        confidence_score: 90,
      });

      const highErrorWord = createMockWord("word-2", {
        total_attempts: 10,
        correct_count: 5,
        incorrect_count: 5,
        consecutive_correct: 0,
        confidence_score: 50,
      });

      const lowWeight = calculateWeight(lowErrorWord);
      const highWeight = calculateWeight(highErrorWord);

      expect(highWeight).toBeGreaterThan(lowWeight);
    });

    it("applies recency multiplier for words not tested in over 7 days", () => {
      const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const recentWord = createMockWord("word-1", {
        total_attempts: 5,
        correct_count: 5,
        incorrect_count: 0,
        consecutive_correct: 2,
        last_tested: new Date().toISOString(),
        confidence_score: 100,
      });

      const oldWord = createMockWord("word-2", {
        total_attempts: 5,
        correct_count: 5,
        incorrect_count: 0,
        consecutive_correct: 2,
        last_tested: sevenDaysAgo,
        confidence_score: 100,
      });

      const recentWeight = calculateWeight(recentWord);
      const oldWeight = calculateWeight(oldWord);

      expect(oldWeight).toBeGreaterThan(recentWeight);
    });

    it("applies medium recency multiplier for words not tested in 3-7 days", () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

      const word = createMockWord("word-1", {
        total_attempts: 5,
        correct_count: 5,
        incorrect_count: 0,
        consecutive_correct: 2,
        last_tested: fourDaysAgo,
        confidence_score: 100,
      });

      const weight = calculateWeight(word);
      expect(weight).toBeGreaterThan(100);
    });

    it("applies confidence penalty for low confidence scores", () => {
      const highConfidenceWord = createMockWord("word-1", {
        total_attempts: 5,
        correct_count: 5,
        incorrect_count: 0,
        consecutive_correct: 2,
        confidence_score: 100,
      });

      const lowConfidenceWord = createMockWord("word-2", {
        total_attempts: 5,
        correct_count: 5,
        incorrect_count: 0,
        consecutive_correct: 2,
        confidence_score: 50,
      });

      const highWeight = calculateWeight(highConfidenceWord);
      const lowWeight = calculateWeight(lowConfidenceWord);

      expect(lowWeight).toBeGreaterThan(highWeight);
    });
  });

  describe("createWeightedWords", () => {
    it("creates weighted word objects from word array", () => {
      const words = [createMockWord("word-1"), createMockWord("word-2")];
      const weighted = createWeightedWords(words);

      expect(weighted).toHaveLength(2);
      expect(weighted[0]).toHaveProperty("word");
      expect(weighted[0]).toHaveProperty("weight");
      expect(weighted[0].weight).toBe(100);
    });

    it("returns empty array for empty input", () => {
      const weighted = createWeightedWords([]);
      expect(weighted).toEqual([]);
    });
  });

  describe("sortWeightedWordsByWeight", () => {
    it("sorts weighted words in descending order by weight", () => {
      const weighted: WeightedWord[] = [
        { word: createMockWord("word-1"), weight: 50 },
        { word: createMockWord("word-2"), weight: 150 },
        { word: createMockWord("word-3"), weight: 100 },
      ];

      const sorted = sortWeightedWordsByWeight(weighted);

      expect(sorted[0].weight).toBe(150);
      expect(sorted[1].weight).toBe(100);
      expect(sorted[2].weight).toBe(50);
    });

    it("does not mutate original array", () => {
      const weighted: WeightedWord[] = [
        { word: createMockWord("word-1"), weight: 50 },
        { word: createMockWord("word-2"), weight: 150 },
      ];

      const original = [...weighted];
      sortWeightedWordsByWeight(weighted);

      expect(weighted).toEqual(original);
    });
  });

  describe("calculateTotalWeight", () => {
    it("calculates sum of all weights", () => {
      const weighted: WeightedWord[] = [
        { word: createMockWord("word-1"), weight: 50 },
        { word: createMockWord("word-2"), weight: 100 },
        { word: createMockWord("word-3"), weight: 150 },
      ];

      expect(calculateTotalWeight(weighted)).toBe(300);
    });

    it("returns 0 for empty array", () => {
      expect(calculateTotalWeight([])).toBe(0);
    });
  });

  describe("selectWeightedWordByRandom", () => {
    it("selects first word when random is very low", () => {
      const weighted: WeightedWord[] = [
        { word: createMockWord("word-1"), weight: 100 },
        { word: createMockWord("word-2"), weight: 100 },
        { word: createMockWord("word-3"), weight: 100 },
      ];

      const index = selectWeightedWordByRandom(weighted, 300, 0.01);
      expect(index).toBe(0);
    });

    it("selects word based on cumulative weight", () => {
      const weighted: WeightedWord[] = [
        { word: createMockWord("word-1"), weight: 100 },
        { word: createMockWord("word-2"), weight: 200 },
        { word: createMockWord("word-3"), weight: 100 },
      ];

      const index = selectWeightedWordByRandom(weighted, 400, 0.5);
      expect(index).toBe(1);
    });
  });

  describe("selectTestWords", () => {
    it("returns empty array when input is empty", () => {
      const result = selectTestWords([], 5);
      expect(result).toEqual([]);
    });

    it("returns all words when count is greater than or equal to word count", () => {
      const words = [createMockWord("word-1"), createMockWord("word-2"), createMockWord("word-3")];

      const result1 = selectTestWords(words, 3);
      expect(result1).toHaveLength(3);

      const result2 = selectTestWords(words, 5);
      expect(result2).toHaveLength(3);
    });

    it("selects specified number of words", () => {
      const words = [
        createMockWord("word-1"),
        createMockWord("word-2"),
        createMockWord("word-3"),
        createMockWord("word-4"),
        createMockWord("word-5"),
      ];

      const result = selectTestWords(words, 3);
      expect(result).toHaveLength(3);
    });

    it("does not select the same word twice", () => {
      const words = Array.from({ length: 10 }, (_, i) => createMockWord(`word-${i}`));

      const result = selectTestWords(words, 5);
      const ids = result.map((w) => w.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it("uses custom random generator when provided", () => {
      const words = [
        createMockWord("word-1"),
        createMockWord("word-2"),
        createMockWord("word-3"),
        createMockWord("word-4"),
      ];

      const mockRandom = vi.fn();
      mockRandom.mockReturnValueOnce(0.1);
      mockRandom.mockReturnValueOnce(0.2);

      const result = selectTestWords(words, 2, mockRandom);

      expect(result).toHaveLength(2);
      expect(mockRandom).toHaveBeenCalledTimes(2);
    });

    it("prefers words with higher weights", () => {
      const words = [
        createMockWord("word-1", {
          total_attempts: 10,
          correct_count: 9,
          incorrect_count: 1,
          consecutive_correct: 2,
          confidence_score: 90,
        }),
        createMockWord("word-2", {
          total_attempts: 10,
          correct_count: 3,
          incorrect_count: 7,
          consecutive_correct: 0,
          confidence_score: 30,
        }),
      ];

      const selectedCount = { "word-1": 0, "word-2": 0 };

      for (let i = 0; i < 100; i++) {
        const result = selectTestWords(words, 1);
        selectedCount[result[0].id as keyof typeof selectedCount]++;
      }

      expect(selectedCount["word-2"]).toBeGreaterThan(selectedCount["word-1"]);
    });
  });

  describe("calculateConfidenceScore", () => {
    it("returns 0 for words with no attempts", () => {
      const score = calculateConfidenceScore({
        correct_count: 0,
        incorrect_count: 0,
        total_attempts: 0,
        consecutive_correct: 0,
      });
      expect(score).toBe(0);
    });

    it("calculates score based on correct rate", () => {
      const score = calculateConfidenceScore({
        correct_count: 7,
        incorrect_count: 3,
        total_attempts: 10,
        consecutive_correct: 2,
      });
      expect(score).toBe(70);
    });

    it("adds bonus for 5+ consecutive correct", () => {
      const scoreWithoutBonus = calculateConfidenceScore({
        correct_count: 10,
        incorrect_count: 0,
        total_attempts: 10,
        consecutive_correct: 2,
      });

      const scoreWithBonus = calculateConfidenceScore({
        correct_count: 10,
        incorrect_count: 0,
        total_attempts: 10,
        consecutive_correct: 5,
      });

      expect(scoreWithBonus).toBeGreaterThanOrEqual(scoreWithoutBonus);
      expect(scoreWithBonus).toBe(100);
    });

    it("adds bonus for 3-4 consecutive correct", () => {
      const scoreWithoutBonus = calculateConfidenceScore({
        correct_count: 7,
        incorrect_count: 3,
        total_attempts: 10,
        consecutive_correct: 2,
      });

      const scoreWithBonus = calculateConfidenceScore({
        correct_count: 7,
        incorrect_count: 3,
        total_attempts: 10,
        consecutive_correct: 3,
      });

      expect(scoreWithBonus).toBeGreaterThan(scoreWithoutBonus);
      expect(scoreWithBonus).toBe(80);
    });

    it("applies penalty for low attempt count", () => {
      const highAttempts = calculateConfidenceScore({
        correct_count: 10,
        incorrect_count: 0,
        total_attempts: 10,
        consecutive_correct: 2,
      });

      const lowAttempts = calculateConfidenceScore({
        correct_count: 3,
        incorrect_count: 0,
        total_attempts: 3,
        consecutive_correct: 2,
      });

      expect(lowAttempts).toBeLessThan(highAttempts);
      expect(lowAttempts).toBe(80);
    });

    it("caps score at 100", () => {
      const score = calculateConfidenceScore({
        correct_count: 100,
        incorrect_count: 0,
        total_attempts: 100,
        consecutive_correct: 10,
      });
      expect(score).toBe(100);
    });

    it("floors score at 0", () => {
      const score = calculateConfidenceScore({
        correct_count: 0,
        incorrect_count: 100,
        total_attempts: 100,
        consecutive_correct: 0,
      });
      expect(score).toBe(0);
    });
  });

  describe("shuffleArray", () => {
    it("returns array with same length", () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(array);
      expect(shuffled).toHaveLength(5);
    });

    it("contains all original elements", () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(array);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it("does not mutate original array", () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      shuffleArray(array);
      expect(array).toEqual(original);
    });

    it("uses custom random generator when provided", () => {
      const array = [1, 2, 3, 4, 5];
      const mockRandom = vi.fn();
      mockRandom.mockReturnValue(0.5);

      shuffleArray(array, mockRandom);

      expect(mockRandom).toHaveBeenCalled();
    });

    it("returns different order when called multiple times", () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const results = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const shuffled = shuffleArray(array);
        results.add(JSON.stringify(shuffled));
      }

      expect(results.size).toBeGreaterThan(1);
    });

    it("handles empty array", () => {
      const shuffled = shuffleArray([]);
      expect(shuffled).toEqual([]);
    });

    it("handles single element array", () => {
      const shuffled = shuffleArray([1]);
      expect(shuffled).toEqual([1]);
    });

    it("works with different types", () => {
      const strings = shuffleArray(["a", "b", "c"]);
      expect(strings).toHaveLength(3);

      const objects = shuffleArray([{ id: 1 }, { id: 2 }]);
      expect(objects).toHaveLength(2);
    });
  });
});
