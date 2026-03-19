import { describe, it, expect } from "vitest";
import {
  romanizeHebrew,
  truncateShortEnglish,
  calculatePopupPosition,
  mapCachedDataToDefinition,
  mapApiResponseToDefinition,
} from "./wordDefinitionPopupUtils";

describe("romanizeHebrew", () => {
  it("should convert Hebrew letters to Roman equivalents", () => {
    expect(romanizeHebrew("שלום")).toBe("shlvm");
  });

  it("should handle empty string", () => {
    expect(romanizeHebrew("")).toBe("");
  });

  it("should preserve non-Hebrew characters", () => {
    expect(romanizeHebrew("abc123")).toBe("abc123");
  });

  it("should handle mixed Hebrew and non-Hebrew", () => {
    expect(romanizeHebrew("שלום world")).toBe("shlvm world");
  });

  it("should handle final letters", () => {
    expect(romanizeHebrew("ךםןףץ")).toBe("kmnfts");
  });

  it("should handle ayin as empty string", () => {
    expect(romanizeHebrew("ע")).toBe("");
  });
});

describe("truncateShortEnglish", () => {
  it("should return text as-is if under max length", () => {
    expect(truncateShortEnglish("short text")).toBe("short text");
  });

  it("should not truncate semicolon-delimited translation lists", () => {
    const text = "to renovate; to repair; to refurbish";
    expect(truncateShortEnglish(text)).toBe(text);
  });

  it("should truncate text over max length with ellipsis", () => {
    const longText = "This is a very long text that should be truncated";
    const result = truncateShortEnglish(longText, 20);
    expect(result).toBe("This is a very long...");
    expect(result.length).toBeLessThanOrEqual(23); // 20 + "..."
  });

  it("should return 'Translation unavailable' for empty string", () => {
    expect(truncateShortEnglish("")).toBe("Translation unavailable");
  });

  it("should return 'Translation unavailable' for whitespace only", () => {
    expect(truncateShortEnglish("   ")).toBe("Translation unavailable");
  });

  it("should use default max length of 120", () => {
    const text = "a".repeat(200);
    const result = truncateShortEnglish(text);
    expect(result).toBe("a".repeat(120) + "...");
  });

  it("should trim whitespace before checking length", () => {
    expect(truncateShortEnglish("  short  ")).toBe("short");
  });
});

describe("calculatePopupPosition", () => {
  it("should calculate position within bounds", () => {
    // For windowHeight=768, maxPopupHeight=668, maxTop=768-668-20=80
    // y=60 is within bounds (between minTop=50 and maxTop=80)
    const result = calculatePopupPosition({ x: 500, y: 60 }, 1024, 768);
    expect(result.left).toBe("500px");
    expect(result.top).toBe("60px");
    expect(result.maxHeight).toBe(668);
  });

  it("should clamp x to minimum 160", () => {
    const result = calculatePopupPosition({ x: 50, y: 60 }, 1024, 768);
    expect(result.left).toBe("160px");
  });

  it("should clamp x to maximum windowWidth - 160", () => {
    const result = calculatePopupPosition({ x: 1000, y: 60 }, 1024, 768);
    expect(result.left).toBe("864px");
  });

  it("should clamp y to minimum 50", () => {
    const result = calculatePopupPosition({ x: 500, y: 10 }, 1024, 768);
    expect(result.top).toBe("50px");
  });

  it("should clamp y to maximum so popup fits in viewport", () => {
    // For windowHeight=768, maxPopupHeight=668, maxTop=768-668-20=80
    const result = calculatePopupPosition({ x: 500, y: 300 }, 1024, 768);
    expect(result.top).toBe("80px");
  });

  it("should calculate correct maxHeight", () => {
    const result = calculatePopupPosition({ x: 500, y: 60 }, 1024, 500);
    expect(result.maxHeight).toBe(400);
  });
});

describe("mapCachedDataToDefinition", () => {
  it("should map cached data to definition format", () => {
    const cachedData = {
      word_with_vowels: "שָׁלוֹם",
      definition: "Peace, hello, goodbye",
      transliteration: "shalom",
      examples: [{ hebrew: "שלום לך", english: "Hello to you" }],
      notes: "Common greeting",
      forms: [{ hebrew: "שלומות", transliteration: "shlomot", relationship: "plural" }],
      short_english: "peace",
    };

    const result = mapCachedDataToDefinition(cachedData);

    expect(result.data.wordWithVowels).toBe("שָׁלוֹם");
    expect(result.data.definition).toBe("Peace, hello, goodbye");
    expect(result.data.transliteration).toBe("shalom");
    expect(result.data.examples).toEqual([{ hebrew: "שלום לך", english: "Hello to you" }]);
    expect(result.data.notes).toBe("Common greeting");
    expect(result.data.shortEnglish).toBe("peace");
    expect(result.shortEnglish).toBe("peace");
  });

  it("should prefer full definition when cached short_english is truncated", () => {
    const cachedData = {
      word_with_vowels: "שָׁלוֹם",
      definition: "to renovate; to repair; to refurbish",
      transliteration: "shalom",
      examples: [],
      notes: null,
      forms: [],
      short_english: "to renovate; to repair; to re...",
    };

    const result = mapCachedDataToDefinition(cachedData);

    expect(result.shortEnglish).toBe("to renovate; to repair; to refurbish");
    expect(result.data.shortEnglish).toBe("to renovate; to repair; to refurbish");
  });

  it("should handle null/undefined optional fields", () => {
    const cachedData = {
      word_with_vowels: "מילה",
      definition: "word",
      transliteration: "mila",
      examples: null,
      notes: null,
      forms: null,
      short_english: "word",
    };

    const result = mapCachedDataToDefinition(cachedData);

    expect(result.data.examples).toEqual([]);
    expect(result.data.notes).toBe("");
    expect(result.data.forms).toEqual([]);
  });
});

describe("mapApiResponseToDefinition", () => {
  it("should map API response and create shortEnglish", () => {
    const apiData = {
      definition: "Peace, hello, goodbye",
      transliteration: "shalom",
      wordWithVowels: "שָׁלוֹם",
    };

    const result = mapApiResponseToDefinition(apiData);

    expect(result.data.shortEnglish).toBe("Peace, hello, goodbye");
    expect(result.shortEnglish).toBe("Peace, hello, goodbye");
  });

  it("should truncate long definitions for shortEnglish", () => {
    const longDef = "This is a very long definition that keeps going and going and going until it exceeds the maximum allowed length of one hundred and twenty characters for the short English translation field";
    const apiData = {
      definition: longDef,
      transliteration: "test",
    };

    const result = mapApiResponseToDefinition(apiData);

    expect(result.shortEnglish.length).toBeLessThanOrEqual(123); // 120 + "..."
    expect(result.shortEnglish).toContain("...");
  });

  it("should handle empty definition", () => {
    const apiData = {
      definition: "",
      transliteration: "test",
    };

    const result = mapApiResponseToDefinition(apiData);

    expect(result.shortEnglish).toBe("Translation unavailable");
  });

  it("should preserve other API fields", () => {
    const apiData = {
      definition: "test",
      transliteration: "test",
      examples: [{ hebrew: "א", english: "a" }],
      notes: "some notes",
    };

    const result = mapApiResponseToDefinition(apiData);

    expect(result.data.examples).toEqual([{ hebrew: "א", english: "a" }]);
    expect(result.data.notes).toBe("some notes");
  });
});
