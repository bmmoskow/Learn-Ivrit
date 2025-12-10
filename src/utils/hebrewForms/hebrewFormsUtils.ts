/**
 * Pure utility functions for generating Hebrew word forms.
 *
 * IMPORTANT: This file contains pure functions without external dependencies.
 * Keeping pure functions here allows unit testing without mocking.
 */

export const DEFINITE_ARTICLE = 'ה';
export const COMMON_PREFIXES = ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'];
export const VOWEL_MARKS = '\u05B0-\u05BD\u05BF-\u05C2\u05C4\u05C5\u05C7';

export interface HebrewForm {
  hebrew: string;
  transliteration: string;
  relationship: string;
}

export function isVowelMark(char: string): boolean {
  return new RegExp(`[${VOWEL_MARKS}]`).test(char);
}

export function removeVowelMarks(word: string): string {
  return word.replace(new RegExp(`[${VOWEL_MARKS}]`, 'g'), '');
}

export function removeFirstCharWithVowels(word: string): string {
  let result = '';
  let skipFirst = true;

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const isVowel = isVowelMark(char);

    if (skipFirst && !isVowel) {
      skipFirst = false;
      continue;
    }

    if (!skipFirst) {
      result += char;
    }
  }

  return result;
}

export function countConsonantsFromPosition(word: string, startPosition: number): number {
  const chars = Array.from(word);
  return chars.slice(startPosition).filter(c => !isVowelMark(c)).length;
}

export function removeLastNCharsKeepVowels(word: string, n: number): string {
  const chars = Array.from(word);
  let result = '';

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const isVowel = isVowelMark(char);
    const consonantsFromEnd = countConsonantsFromPosition(word, i + 1);

    if (consonantsFromEnd >= n) {
      result += char;
    } else if (isVowel && consonantsFromEnd > n) {
      result += char;
    }
  }

  return result;
}

export function startsWithDefiniteArticle(word: string): boolean {
  return word.startsWith(DEFINITE_ARTICLE) && word.length > 2;
}

export function startsWithCommonPrefix(word: string): boolean {
  return COMMON_PREFIXES.some(prefix =>
    word.startsWith(prefix) && word.length > 2 && !word.startsWith(DEFINITE_ARTICLE)
  );
}

export function removeDefiniteArticle(
  word: string,
  transliteration: string
): HebrewForm | null {
  if (!startsWithDefiniteArticle(word)) {
    return null;
  }

  const withoutArticle = removeFirstCharWithVowels(word);
  if (!withoutArticle || withoutArticle === word) {
    return null;
  }

  return {
    hebrew: withoutArticle,
    transliteration: transliteration.replace(/^(ha|he)/i, ''),
    relationship: 'without definite article'
  };
}

export function removePrefix(
  word: string,
  transliteration: string
): HebrewForm | null {
  if (!startsWithCommonPrefix(word)) {
    return null;
  }

  const prefix = COMMON_PREFIXES.find(p => word.startsWith(p) && !word.startsWith(DEFINITE_ARTICLE));
  if (!prefix) {
    return null;
  }

  const withoutPrefix = removeFirstCharWithVowels(word);
  if (!withoutPrefix || withoutPrefix === word) {
    return null;
  }

  return {
    hebrew: withoutPrefix,
    transliteration: transliteration,
    relationship: `root form (without ${prefix})`
  };
}

export function convertMasculinePluralToSingular(
  word: string,
  transliteration: string
): HebrewForm | null {
  const plainWord = removeVowelMarks(word);

  if (!plainWord.endsWith('ים')) {
    return null;
  }

  const singular = removeLastNCharsKeepVowels(word, 2);
  if (!singular || singular === word) {
    return null;
  }

  return {
    hebrew: singular,
    transliteration: transliteration.replace(/(im|eem)$/i, ''),
    relationship: 'singular (masculine plural)'
  };
}

export function convertFemininePluralToSingular(
  word: string,
  transliteration: string
): HebrewForm | null {
  const plainWord = removeVowelMarks(word);

  if (!plainWord.endsWith('ות')) {
    return null;
  }

  const singular = removeLastNCharsKeepVowels(word, 2);
  if (!singular || singular === word) {
    return null;
  }

  return {
    hebrew: singular,
    transliteration: transliteration.replace(/(ot|oot)$/i, 'a'),
    relationship: 'singular (feminine plural)'
  };
}

export function convertFeminineToMasculine(
  word: string,
  transliteration: string
): HebrewForm | null {
  const plainWord = removeVowelMarks(word);

  if (!plainWord.endsWith('ה') || plainWord.endsWith('ים') || plainWord.endsWith('ות')) {
    return null;
  }

  const masculine = removeLastNCharsKeepVowels(word, 1);
  if (!masculine || masculine === word) {
    return null;
  }

  return {
    hebrew: masculine,
    transliteration: transliteration.replace(/a$/i, ''),
    relationship: 'masculine form'
  };
}

export function addDefiniteArticle(
  word: string,
  transliteration: string
): HebrewForm | null {
  if (word.startsWith(DEFINITE_ARTICLE)) {
    return null;
  }

  return {
    hebrew: 'הַ' + word,
    transliteration: 'ha' + transliteration,
    relationship: 'with definite article'
  };
}

export function generateBasicHebrewForms(
  word: string,
  transliteration: string,
  maxForms: number = 3
): HebrewForm[] {
  const forms: HebrewForm[] = [];

  const withoutArticle = removeDefiniteArticle(word, transliteration);
  if (withoutArticle) {
    forms.push(withoutArticle);
  }

  const withoutPrefix = removePrefix(word, transliteration);
  if (withoutPrefix) {
    forms.push(withoutPrefix);
  }

  const masculineSingular = convertMasculinePluralToSingular(word, transliteration);
  if (masculineSingular) {
    forms.push(masculineSingular);
  }

  const feminineSingular = convertFemininePluralToSingular(word, transliteration);
  if (feminineSingular) {
    forms.push(feminineSingular);
  }

  const masculine = convertFeminineToMasculine(word, transliteration);
  if (masculine) {
    forms.push(masculine);
  }

  const withArticle = addDefiniteArticle(word, transliteration);
  if (withArticle) {
    forms.push(withArticle);
  }

  return forms.slice(0, maxForms);
}
