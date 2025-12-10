import { describe, it, expect } from "vitest";
import {
  isVowelMark,
  removeVowelMarks,
  removeFirstCharWithVowels,
  countConsonantsFromPosition,
  removeLastNCharsKeepVowels,
  startsWithDefiniteArticle,
  startsWithCommonPrefix,
  removeDefiniteArticle,
  removePrefix,
  convertMasculinePluralToSingular,
  convertFemininePluralToSingular,
  convertFeminineToMasculine,
  addDefiniteArticle,
  generateBasicHebrewForms,
  DEFINITE_ARTICLE,
  COMMON_PREFIXES,
  VOWEL_MARKS,
} from "./hebrewFormsUtils";

describe("hebrewFormsUtils", () => {
  describe("constants", () => {
    it("should have correct definite article", () => {
      expect(DEFINITE_ARTICLE).toBe("ה");
    });

    it("should have correct common prefixes", () => {
      expect(COMMON_PREFIXES).toEqual(["ה", "ו", "ב", "כ", "ל", "מ", "ש"]);
    });

    it("should have vowel marks pattern", () => {
      expect(VOWEL_MARKS).toBe("\u05B0-\u05BD\u05BF-\u05C2\u05C4\u05C5\u05C7");
    });
  });

  describe("isVowelMark", () => {
    it("identifies Hebrew vowel marks", () => {
      expect(isVowelMark("\u05B0")).toBe(true);
      expect(isVowelMark("\u05B1")).toBe(true);
      expect(isVowelMark("\u05BB")).toBe(true);
    });

    it("returns false for consonants", () => {
      expect(isVowelMark("ש")).toBe(false);
      expect(isVowelMark("ל")).toBe(false);
      expect(isVowelMark("ו")).toBe(false);
    });

    it("returns false for Latin characters", () => {
      expect(isVowelMark("a")).toBe(false);
      expect(isVowelMark("e")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isVowelMark("")).toBe(false);
    });
  });

  describe("removeVowelMarks", () => {
    it("removes all vowel marks from Hebrew word", () => {
      const word = "שָׁלוֹם";
      const result = removeVowelMarks(word);
      expect(result).not.toContain("\u05B8");
      expect(result).not.toContain("\u05B9");
    });

    it("preserves consonants", () => {
      const word = "שלום";
      const result = removeVowelMarks(word);
      expect(result).toBe("שלום");
    });

    it("handles empty string", () => {
      expect(removeVowelMarks("")).toBe("");
    });

    it("handles string with only vowels", () => {
      const vowels = "\u05B0\u05B1\u05B2";
      expect(removeVowelMarks(vowels)).toBe("");
    });
  });

  describe("removeFirstCharWithVowels", () => {
    it("removes first consonant and its vowels", () => {
      const word = "הַשָּׁלוֹם";
      const result = removeFirstCharWithVowels(word);
      expect(result.startsWith("ה")).toBe(false);
    });

    it("handles word without vowels", () => {
      const word = "שלום";
      const result = removeFirstCharWithVowels(word);
      expect(result).toBe("לום");
    });

    it("handles empty string", () => {
      expect(removeFirstCharWithVowels("")).toBe("");
    });

    it("handles single character", () => {
      expect(removeFirstCharWithVowels("ה")).toBe("");
    });

    it("preserves subsequent vowels", () => {
      const word = "שָׁלוֹם";
      const result = removeFirstCharWithVowels(word);
      expect(result).toContain("\u05B9");
    });
  });

  describe("countConsonantsFromPosition", () => {
    it("counts consonants from given position", () => {
      const word = "שָׁלוֹם";
      const count = countConsonantsFromPosition(word, 0);
      expect(count).toBeGreaterThan(0);
    });

    it("returns 0 for position at end", () => {
      const word = "שלום";
      const count = countConsonantsFromPosition(word, word.length);
      expect(count).toBe(0);
    });

    it("excludes vowel marks from count", () => {
      const word = "שָׁלוֹם";
      const plainWord = "שלום";
      const count1 = countConsonantsFromPosition(word, 1);
      const count2 = countConsonantsFromPosition(plainWord, 1);
      expect(count1).toBe(count2);
    });

    it("handles empty string", () => {
      expect(countConsonantsFromPosition("", 0)).toBe(0);
    });
  });

  describe("removeLastNCharsKeepVowels", () => {
    it("removes last N consonants while keeping vowels", () => {
      const word = "שָׁלוֹם";
      const result = removeLastNCharsKeepVowels(word, 1);
      expect(result.length).toBeLessThan(word.length);
    });

    it("removes 2 consonants for plural forms", () => {
      const word = "דְּבָרִים";
      const result = removeLastNCharsKeepVowels(word, 2);
      expect(result.length).toBeLessThan(word.length);
    });

    it("handles word without vowels", () => {
      const word = "שלום";
      const result = removeLastNCharsKeepVowels(word, 1);
      expect(result).toBe("שלו");
    });

    it("handles empty string", () => {
      expect(removeLastNCharsKeepVowels("", 1)).toBe("");
    });

    it("handles removing more chars than available", () => {
      const word = "שָׁל";
      const result = removeLastNCharsKeepVowels(word, 10);
      expect(result).toBe("");
    });
  });

  describe("startsWithDefiniteArticle", () => {
    it("returns true for words with definite article", () => {
      expect(startsWithDefiniteArticle("הַשָּׁלוֹם")).toBe(true);
      expect(startsWithDefiniteArticle("הבית")).toBe(true);
    });

    it("returns false for words without definite article", () => {
      expect(startsWithDefiniteArticle("שָּׁלוֹם")).toBe(false);
      expect(startsWithDefiniteArticle("בית")).toBe(false);
    });

    it("returns false for single character", () => {
      expect(startsWithDefiniteArticle("ה")).toBe(false);
    });

    it("returns false for two characters", () => {
      expect(startsWithDefiniteArticle("הא")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(startsWithDefiniteArticle("")).toBe(false);
    });
  });

  describe("startsWithCommonPrefix", () => {
    it("returns true for words with common prefixes", () => {
      expect(startsWithCommonPrefix("ושלום")).toBe(true);
      expect(startsWithCommonPrefix("בבית")).toBe(true);
      expect(startsWithCommonPrefix("לבית")).toBe(true);
    });

    it("returns false for words with definite article", () => {
      expect(startsWithCommonPrefix("הבית")).toBe(false);
    });

    it("returns false for words without prefixes", () => {
      expect(startsWithCommonPrefix("דבר")).toBe(false);
    });

    it("returns false for single character", () => {
      expect(startsWithCommonPrefix("ו")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(startsWithCommonPrefix("")).toBe(false);
    });
  });

  describe("removeDefiniteArticle", () => {
    it("removes definite article from word", () => {
      const result = removeDefiniteArticle("הַבַּיִת", "habayit");
      expect(result).not.toBeNull();
      expect(result?.hebrew.startsWith("ה")).toBe(false);
      expect(result?.transliteration).toBe("bayit");
      expect(result?.relationship).toBe("without definite article");
    });

    it("handles 'he' pronunciation", () => {
      const result = removeDefiniteArticle("הבית", "hebayit");
      expect(result?.transliteration).toBe("bayit");
    });

    it("returns null for words without article", () => {
      const result = removeDefiniteArticle("שלום", "shalom");
      expect(result).toBeNull();
    });

    it("returns null for short words", () => {
      const result = removeDefiniteArticle("הא", "ha");
      expect(result).toBeNull();
    });

    it("returns null if removal produces same word", () => {
      const result = removeDefiniteArticle("ה", "h");
      expect(result).toBeNull();
    });
  });

  describe("removePrefix", () => {
    it("removes common prefix from word", () => {
      const result = removePrefix("ושלום", "veshalom");
      expect(result).not.toBeNull();
      expect(result?.hebrew.startsWith("ו")).toBe(false);
      expect(result?.relationship).toContain("root form");
    });

    it("identifies which prefix was removed", () => {
      const result = removePrefix("בבית", "bebayit");
      expect(result?.relationship).toContain("ב");
    });

    it("returns null for words without common prefix", () => {
      const result = removePrefix("דבר", "davar");
      expect(result).toBeNull();
    });

    it("returns null for words with definite article", () => {
      const result = removePrefix("הבית", "habayit");
      expect(result).toBeNull();
    });

    it("returns null for short words", () => {
      const result = removePrefix("וא", "ve");
      expect(result).toBeNull();
    });
  });

  describe("convertMasculinePluralToSingular", () => {
    it("converts masculine plural to singular", () => {
      const result = convertMasculinePluralToSingular("דְּבָרִים", "devarim");
      expect(result).not.toBeNull();
      expect(result?.transliteration).not.toMatch(/(im|eem)$/i);
      expect(result?.relationship).toBe("singular (masculine plural)");
    });

    it("removes 'im' from transliteration", () => {
      const result = convertMasculinePluralToSingular("בָּנִים", "banim");
      expect(result?.transliteration).toBe("ban");
    });

    it("removes 'eem' from transliteration", () => {
      const result = convertMasculinePluralToSingular("בָּנִים", "baneem");
      expect(result?.transliteration).toBe("ban");
    });

    it("returns null for non-plural words", () => {
      const result = convertMasculinePluralToSingular("שָׁלוֹם", "shalom");
      expect(result).toBeNull();
    });

    it("returns null for feminine plural", () => {
      const result = convertMasculinePluralToSingular("בָּנוֹת", "banot");
      expect(result).toBeNull();
    });
  });

  describe("convertFemininePluralToSingular", () => {
    it("converts feminine plural to singular", () => {
      const result = convertFemininePluralToSingular("בָּנוֹת", "banot");
      expect(result).not.toBeNull();
      expect(result?.transliteration).toMatch(/a$/);
      expect(result?.relationship).toBe("singular (feminine plural)");
    });

    it("replaces 'ot' with 'a'", () => {
      const result = convertFemininePluralToSingular("תּוֹרוֹת", "torot");
      expect(result?.transliteration).toBe("tora");
    });

    it("replaces 'oot' with 'a'", () => {
      const result = convertFemininePluralToSingular("תּוֹרוֹת", "toroot");
      expect(result?.transliteration).toBe("tora");
    });

    it("returns null for non-plural words", () => {
      const result = convertFemininePluralToSingular("שָׁלוֹם", "shalom");
      expect(result).toBeNull();
    });

    it("returns null for masculine plural", () => {
      const result = convertFemininePluralToSingular("בָּנִים", "banim");
      expect(result).toBeNull();
    });
  });

  describe("convertFeminineToMasculine", () => {
    it("converts feminine form to masculine", () => {
      const result = convertFeminineToMasculine("טוֹבָה", "tova");
      expect(result).not.toBeNull();
      expect(result?.transliteration).toBe("tov");
      expect(result?.relationship).toBe("masculine form");
    });

    it("removes final 'a' from transliteration", () => {
      const result = convertFeminineToMasculine("יָפָה", "yafa");
      expect(result?.transliteration).toBe("yaf");
    });

    it("returns null for words not ending in ה", () => {
      const result = convertFeminineToMasculine("שָׁלוֹם", "shalom");
      expect(result).toBeNull();
    });

    it("returns null for masculine plural ending in ים", () => {
      const result = convertFeminineToMasculine("טוֹבִים", "tovim");
      expect(result).toBeNull();
    });

    it("returns null for feminine plural ending in ות", () => {
      const result = convertFeminineToMasculine("טוֹבוֹת", "tovot");
      expect(result).toBeNull();
    });
  });

  describe("addDefiniteArticle", () => {
    it("adds definite article to word", () => {
      const result = addDefiniteArticle("שָׁלוֹם", "shalom");
      expect(result).not.toBeNull();
      expect(result?.hebrew).toBe("הַשָׁלוֹם");
      expect(result?.transliteration).toBe("hashalom");
      expect(result?.relationship).toBe("with definite article");
    });

    it("prepends 'ha' to transliteration", () => {
      const result = addDefiniteArticle("בַּיִת", "bayit");
      expect(result?.transliteration).toBe("habayit");
    });

    it("returns null for words already with article", () => {
      const result = addDefiniteArticle("הַבַּיִת", "habayit");
      expect(result).toBeNull();
    });

    it("handles empty word", () => {
      const result = addDefiniteArticle("", "");
      expect(result).not.toBeNull();
      expect(result?.hebrew).toBe("הַ");
    });
  });

  describe("generateBasicHebrewForms", () => {
    it("generates forms for word with definite article", () => {
      const forms = generateBasicHebrewForms("הַבַּיִת", "habayit");
      expect(forms.length).toBeGreaterThan(0);
      expect(forms.some(f => f.relationship === "without definite article")).toBe(true);
    });

    it("generates forms for masculine plural", () => {
      const forms = generateBasicHebrewForms("דְּבָרִים", "devarim");
      expect(forms.some(f => f.relationship === "singular (masculine plural)")).toBe(true);
    });

    it("generates forms for feminine plural", () => {
      const forms = generateBasicHebrewForms("תּוֹרוֹת", "torot");
      expect(forms.some(f => f.relationship === "singular (feminine plural)")).toBe(true);
    });

    it("generates forms for feminine word", () => {
      const forms = generateBasicHebrewForms("טוֹבָה", "tova");
      expect(forms.some(f => f.relationship === "masculine form")).toBe(true);
    });

    it("adds definite article form if not present", () => {
      const forms = generateBasicHebrewForms("שָׁלוֹם", "shalom");
      expect(forms.some(f => f.relationship === "with definite article")).toBe(true);
    });

    it("limits results to maxForms", () => {
      const forms = generateBasicHebrewForms("שָׁלוֹם", "shalom", 2);
      expect(forms.length).toBeLessThanOrEqual(2);
    });

    it("defaults to 3 forms", () => {
      const forms = generateBasicHebrewForms("דְּבָרִים", "devarim");
      expect(forms.length).toBeLessThanOrEqual(3);
    });

    it("handles word with prefix", () => {
      const forms = generateBasicHebrewForms("ושלום", "veshalom");
      expect(forms.some(f => f.relationship.includes("root form"))).toBe(true);
    });

    it("can handle empty word", () => {
      const forms = generateBasicHebrewForms("", "");
      expect(Array.isArray(forms)).toBe(true);
    });

    it("does not generate duplicate forms", () => {
      const forms = generateBasicHebrewForms("שָׁלוֹם", "shalom");
      const hebrewForms = forms.map(f => f.hebrew);
      const uniqueForms = new Set(hebrewForms);
      expect(uniqueForms.size).toBe(hebrewForms.length);
    });

    it("preserves vowels in generated forms", () => {
      const forms = generateBasicHebrewForms("הַשָּׁלוֹם", "hashalom");
      forms.forEach(form => {
        if (form.hebrew) {
          expect(form.hebrew).toBeTruthy();
        }
      });
    });

    it("generates appropriate transliterations", () => {
      const forms = generateBasicHebrewForms("הַבַּיִת", "habayit");
      forms.forEach(form => {
        expect(form.transliteration).toBeTruthy();
        expect(typeof form.transliteration).toBe("string");
      });
    });

    it("provides descriptive relationships", () => {
      const forms = generateBasicHebrewForms("שָׁלוֹם", "shalom");
      forms.forEach(form => {
        expect(form.relationship).toBeTruthy();
        expect(form.relationship.length).toBeGreaterThan(0);
      });
    });
  });
});
