import { describe, it, expect } from "vitest";
import {
  getPerformanceColor,
  getPerformanceIcon,
  calculateTotalPages,
  calculatePaginationRange,
  calculateDisplayRange,
  calculatePageNumbers,
  createEmptyNewWordForm,
  createEditFormFromWord,
  isValidNewWord,
  mapWordsWithStats,
  ITEMS_PER_PAGE,
  type VocabWithStats,
  type VocabularyWord,
  type WordStatistics,
} from "./vocabularyListUtils";

describe("getPerformanceColor", () => {
  it("returns green for score >= 80", () => {
    expect(getPerformanceColor(80)).toBe("bg-green-50 text-green-700 border-green-200");
    expect(getPerformanceColor(100)).toBe("bg-green-50 text-green-700 border-green-200");
  });

  it("returns yellow for score >= 60 and < 80", () => {
    expect(getPerformanceColor(60)).toBe("bg-yellow-50 text-yellow-700 border-yellow-200");
    expect(getPerformanceColor(79)).toBe("bg-yellow-50 text-yellow-700 border-yellow-200");
  });

  it("returns red for score < 60", () => {
    expect(getPerformanceColor(0)).toBe("bg-red-50 text-red-700 border-red-200");
    expect(getPerformanceColor(59)).toBe("bg-red-50 text-red-700 border-red-200");
  });
});

describe("getPerformanceIcon", () => {
  it("returns target emoji for score >= 80", () => {
    expect(getPerformanceIcon(80)).toBe("🎯");
    expect(getPerformanceIcon(100)).toBe("🎯");
  });

  it("returns chart up emoji for score >= 60 and < 80", () => {
    expect(getPerformanceIcon(60)).toBe("📈");
    expect(getPerformanceIcon(79)).toBe("📈");
  });

  it("returns chart down emoji for score < 60", () => {
    expect(getPerformanceIcon(0)).toBe("📉");
    expect(getPerformanceIcon(59)).toBe("📉");
  });
});

describe("calculateTotalPages", () => {
  it("calculates correct number of pages", () => {
    expect(calculateTotalPages(100, 50)).toBe(2);
    expect(calculateTotalPages(51, 50)).toBe(2);
    expect(calculateTotalPages(50, 50)).toBe(1);
    expect(calculateTotalPages(0, 50)).toBe(0);
  });
});

describe("calculatePaginationRange", () => {
  it("calculates correct range for first page", () => {
    expect(calculatePaginationRange(1, 50)).toEqual({ from: 0, to: 49 });
  });

  it("calculates correct range for second page", () => {
    expect(calculatePaginationRange(2, 50)).toEqual({ from: 50, to: 99 });
  });

  it("calculates correct range for custom page size", () => {
    expect(calculatePaginationRange(3, 20)).toEqual({ from: 40, to: 59 });
  });
});

describe("calculateDisplayRange", () => {
  it("calculates correct display range for first page", () => {
    expect(calculateDisplayRange(1, 50, 100)).toEqual({ start: 1, end: 50 });
  });

  it("calculates correct display range for last partial page", () => {
    expect(calculateDisplayRange(2, 50, 75)).toEqual({ start: 51, end: 75 });
  });

  it("handles case where total is less than page size", () => {
    expect(calculateDisplayRange(1, 50, 25)).toEqual({ start: 1, end: 25 });
  });
});

describe("calculatePageNumbers", () => {
  it("returns all pages when total pages <= maxVisible", () => {
    expect(calculatePageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(calculatePageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns first pages when currentPage <= 3", () => {
    expect(calculatePageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(calculatePageNumbers(3, 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns last pages when currentPage >= totalPages - 2", () => {
    expect(calculatePageNumbers(10, 10)).toEqual([6, 7, 8, 9, 10]);
    expect(calculatePageNumbers(8, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it("returns pages centered around currentPage for middle pages", () => {
    expect(calculatePageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(calculatePageNumbers(6, 10)).toEqual([4, 5, 6, 7, 8]);
  });
});

describe("createEmptyNewWordForm", () => {
  it("returns empty form object", () => {
    expect(createEmptyNewWordForm()).toEqual({
      hebrew_word: "",
      english_translation: "",
      definition: "",
      transliteration: "",
    });
  });
});

describe("createEditFormFromWord", () => {
  it("creates edit form from word with definition", () => {
    const word: VocabWithStats = {
      id: "1",
      user_id: "user1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "A greeting",
      transliteration: "shalom",
      created_at: null,
      updated_at: null,
    };
    expect(createEditFormFromWord(word)).toEqual({
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "A greeting",
    });
  });

  it("handles null definition", () => {
    const word: VocabWithStats = {
      id: "1",
      user_id: "user1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: null as unknown as string,
      transliteration: null,
      created_at: null,
      updated_at: null,
    };
    expect(createEditFormFromWord(word)).toEqual({
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "",
    });
  });
});

describe("isValidNewWord", () => {
  it("returns true for valid form", () => {
    expect(isValidNewWord({
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "",
      transliteration: "",
    })).toBe(true);
  });

  it("returns false when hebrew_word is empty", () => {
    expect(isValidNewWord({
      hebrew_word: "",
      english_translation: "hello",
      definition: "",
      transliteration: "",
    })).toBe(false);
  });

  it("returns false when english_translation is empty", () => {
    expect(isValidNewWord({
      hebrew_word: "שלום",
      english_translation: "",
      definition: "",
      transliteration: "",
    })).toBe(false);
  });

  it("returns false when fields are only whitespace", () => {
    expect(isValidNewWord({
      hebrew_word: "  ",
      english_translation: "hello",
      definition: "",
      transliteration: "",
    })).toBe(false);
  });
});

describe("mapWordsWithStats", () => {
  it("maps words with their statistics", () => {
    const words: VocabularyWord[] = [
      {
        id: "1",
        user_id: "user1",
        hebrew_word: "שלום",
        english_translation: "hello",
        definition: "greeting",
        transliteration: "shalom",
        created_at: null,
        updated_at: null,
      },
    ];
    const stats: WordStatistics = {
      id: "stat1",
      user_id: "user1",
      word_id: "1",
      correct_count: 5,
      incorrect_count: 1,
      total_attempts: 6,
      consecutive_correct: 3,
      last_tested: null,
      confidence_score: 80,
      created_at: null,
      updated_at: null,
    };
    const statsMap = new Map([["1", stats]]);

    const result = mapWordsWithStats(words, statsMap);
    expect(result[0].statistics).toEqual(stats);
  });

  it("handles words without statistics", () => {
    const words: VocabularyWord[] = [
      {
        id: "2",
        user_id: "user1",
        hebrew_word: "מים",
        english_translation: "water",
        definition: "liquid",
        transliteration: "mayim",
        created_at: null,
        updated_at: null,
      },
    ];
    const statsMap = new Map<string, WordStatistics>();

    const result = mapWordsWithStats(words, statsMap);
    expect(result[0].statistics).toBeUndefined();
  });
});

describe("ITEMS_PER_PAGE", () => {
  it("equals 50", () => {
    expect(ITEMS_PER_PAGE).toBe(50);
  });
});
