import { describe, it, expect } from "vitest";
import {
  calculateWeaknessScore,
  sortVocabularyByWeakness,
  getAgeLevelDescription,
  buildPassagePrompt,
  validateTopic,
  VocabularyWord,
} from "./passageGeneratorUtils";

describe("passageGeneratorUtils", () => {
  describe("calculateWeaknessScore", () => {
    it("returns 100 for never-tested words", () => {
      const word: VocabularyWord = {
        id: "1",
        hebrew_word: "שלום",
        english_translation: "peace",
        confidence_score: null,
        incorrect_count: null,
        total_attempts: null,
      };
      expect(calculateWeaknessScore(word)).toBe(100);
    });

    it("returns 100 for words with 0 attempts", () => {
      const word: VocabularyWord = {
        id: "1",
        hebrew_word: "שלום",
        english_translation: "peace",
        confidence_score: 0,
        incorrect_count: 0,
        total_attempts: 0,
      };
      expect(calculateWeaknessScore(word)).toBe(100);
    });

    it("returns low score for high confidence words", () => {
      const word: VocabularyWord = {
        id: "1",
        hebrew_word: "שלום",
        english_translation: "peace",
        confidence_score: 100,
        incorrect_count: 0,
        total_attempts: 10,
      };
      const score = calculateWeaknessScore(word);
      expect(score).toBeLessThan(10);
    });

    it("returns high score for low confidence with errors", () => {
      const word: VocabularyWord = {
        id: "1",
        hebrew_word: "שלום",
        english_translation: "peace",
        confidence_score: 10,
        incorrect_count: 8,
        total_attempts: 10,
      };
      const score = calculateWeaknessScore(word);
      expect(score).toBeGreaterThan(70);
    });

    it("considers error rate in scoring", () => {
      const wordWithErrors: VocabularyWord = {
        id: "1",
        hebrew_word: "שלום",
        english_translation: "peace",
        confidence_score: 50,
        incorrect_count: 5,
        total_attempts: 10,
      };
      const wordWithoutErrors: VocabularyWord = {
        id: "2",
        hebrew_word: "בוקר",
        english_translation: "morning",
        confidence_score: 50,
        incorrect_count: 0,
        total_attempts: 10,
      };
      expect(calculateWeaknessScore(wordWithErrors)).toBeGreaterThan(
        calculateWeaknessScore(wordWithoutErrors)
      );
    });
  });

  describe("sortVocabularyByWeakness", () => {
    it("sorts weakest words first", () => {
      const words: VocabularyWord[] = [
        {
          id: "1",
          hebrew_word: "strong",
          english_translation: "strong",
          confidence_score: 90,
          incorrect_count: 0,
          total_attempts: 10,
        },
        {
          id: "2",
          hebrew_word: "weak",
          english_translation: "weak",
          confidence_score: 10,
          incorrect_count: 8,
          total_attempts: 10,
        },
        {
          id: "3",
          hebrew_word: "new",
          english_translation: "new",
          confidence_score: null,
          incorrect_count: null,
          total_attempts: null,
        },
      ];

      const sorted = sortVocabularyByWeakness(words);

      expect(sorted[0].id).toBe("3"); // never tested = highest priority
      expect(sorted[1].id).toBe("2"); // weak
      expect(sorted[2].id).toBe("1"); // strong
    });

    it("does not mutate original array", () => {
      const words: VocabularyWord[] = [
        {
          id: "1",
          hebrew_word: "a",
          english_translation: "a",
          confidence_score: 90,
          incorrect_count: 0,
          total_attempts: 10,
        },
        {
          id: "2",
          hebrew_word: "b",
          english_translation: "b",
          confidence_score: 10,
          incorrect_count: 5,
          total_attempts: 10,
        },
      ];

      const originalFirst = words[0].id;
      sortVocabularyByWeakness(words);

      expect(words[0].id).toBe(originalFirst);
    });

    it("handles empty array", () => {
      const sorted = sortVocabularyByWeakness([]);
      expect(sorted).toEqual([]);
    });
  });

  describe("getAgeLevelDescription", () => {
    it("returns young child description for age 6", () => {
      const desc = getAgeLevelDescription(6);
      expect(desc).toContain("young child");
      expect(desc).toContain("simple");
    });

    it("returns teen description for age 15", () => {
      const desc = getAgeLevelDescription(15);
      expect(desc).toContain("teenager");
      expect(desc).toContain("moderate");
    });

    it("returns adult description", () => {
      const desc = getAgeLevelDescription("adult");
      expect(desc).toContain("adult");
      expect(desc).toContain("full vocabulary");
    });

    it("returns professional description", () => {
      const desc = getAgeLevelDescription("professional");
      expect(desc).toContain("professional");
    });

    it("returns academic description", () => {
      const desc = getAgeLevelDescription("academic");
      expect(desc).toContain("academic");
    });
  });

  describe("buildPassagePrompt", () => {
    it("includes age level in prompt", () => {
      const prompt = buildPassagePrompt(8, "A story about a cat", []);
      expect(prompt).toContain("child");
    });

    it("includes topic in prompt", () => {
      const prompt = buildPassagePrompt("adult", "A story about traveling", []);
      expect(prompt).toContain("A story about traveling");
    });

    it("includes vocabulary in prompt", () => {
      const words: VocabularyWord[] = [
        {
          id: "1",
          hebrew_word: "שלום",
          english_translation: "peace",
          confidence_score: 10,
          incorrect_count: 5,
          total_attempts: 10,
        },
      ];
      const prompt = buildPassagePrompt("adult", "Test topic", words);
      expect(prompt).toContain("שלום");
      expect(prompt).toContain("peace");
    });

    it("limits vocabulary to 30 words", () => {
      const words: VocabularyWord[] = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        hebrew_word: `word${i}`,
        english_translation: `word${i}`,
        confidence_score: 50,
        incorrect_count: 0,
        total_attempts: 10,
      }));
      const prompt = buildPassagePrompt("adult", "Test topic", words);

      // Should contain word0 through word29, but not word30+
      expect(prompt).toContain("word0");
      expect(prompt).toContain("word29");
      expect(prompt).not.toContain("word30");
    });

    it("includes nikud instruction", () => {
      const prompt = buildPassagePrompt("adult", "Test", []);
      expect(prompt).toContain("nikud");
    });

    it("includes prefix/suffix instructions", () => {
      const prompt = buildPassagePrompt("adult", "Test", []);
      expect(prompt).toContain("prefixes");
      expect(prompt).toContain("suffixes");
    });
  });

  describe("validateTopic", () => {
    it("rejects empty topic", () => {
      const result = validateTopic("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("enter a topic");
    });

    it("rejects whitespace-only topic", () => {
      const result = validateTopic("   ");
      expect(result.valid).toBe(false);
    });

    it("rejects short topic", () => {
      const result = validateTopic("short");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("10 characters");
    });

    it("rejects very long topic", () => {
      const result = validateTopic("a".repeat(501));
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too long");
    });

    it("accepts valid topic", () => {
      const result = validateTopic("A story about a boy who finds a lost dog");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("accepts topic at minimum length", () => {
      const result = validateTopic("1234567890");
      expect(result.valid).toBe(true);
    });

    it("accepts topic at maximum length", () => {
      const result = validateTopic("a".repeat(500));
      expect(result.valid).toBe(true);
    });
  });
});
