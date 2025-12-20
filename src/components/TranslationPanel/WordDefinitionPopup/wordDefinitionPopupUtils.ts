export type Example = {
  hebrew: string;
  english: string;
};

export type RelatedWord = {
  hebrew: string;
  english: string;
  relationship: string;
};

export type Definition = {
  translation: string;
  definition: string;
  transliteration: string;
  wordWithVowels?: string;
  examples?: Example[];
  notes?: string;
  relatedWords?: RelatedWord[];
  shortEnglish?: string;
};

export type WordDefinitionPopupProps = {
  word: string;
  sentence: string;
  position: { x: number; y: number };
  onClose: () => void;
  onWordSaved: () => void;
};

export const romanizeHebrew = (text: string): string => {
  const hebrewToRoman: { [key: string]: string } = {
    א: "a",
    ב: "b",
    ג: "g",
    ד: "d",
    ה: "h",
    ו: "v",
    ז: "z",
    ח: "ch",
    ט: "t",
    י: "y",
    כ: "k",
    ך: "k",
    ל: "l",
    ם: "m",
    מ: "m",
    ן: "n",
    נ: "n",
    ס: "s",
    ע: "",
    פ: "p",
    ף: "f",
    צ: "ts",
    ץ: "ts",
    ק: "k",
    ר: "r",
    ש: "sh",
    ת: "t",
  };

  return text
    .split("")
    .map((char) => (char in hebrewToRoman ? hebrewToRoman[char] : char))
    .join("");
};

export const truncateShortEnglish = (text: string, maxLength: number = 40): string => {
  if (!text || text.trim() === "") {
    return "Translation unavailable";
  }
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.substring(0, maxLength).trim() + "...";
};

export const calculatePopupPosition = (
  position: { x: number; y: number },
  windowWidth: number,
  windowHeight: number
): { left: string; top: string; maxHeight: number } => {
  const maxPopupHeight = windowHeight - 100;
  const minTop = 50;
  const maxTop = windowHeight - maxPopupHeight - 20;
  const clampedTop = Math.max(minTop, Math.min(position.y, maxTop));
  return {
    left: `${Math.min(Math.max(position.x, 160), windowWidth - 160)}px`,
    top: `${clampedTop}px`,
    maxHeight: maxPopupHeight,
  };
};

export const mapCachedDataToDefinition = (cachedData: {
  word_with_vowels: string;
  definition: string;
  transliteration: string;
  examples: any;
  notes: string | null;
  forms: any;
  short_english: string;
}): { data: any; shortEnglish: string } => {
  return {
    data: {
      wordWithVowels: cachedData.word_with_vowels,
      definition: cachedData.definition,
      transliteration: cachedData.transliteration,
      examples: cachedData.examples || [],
      notes: cachedData.notes || "",
      forms: cachedData.forms || [],
      shortEnglish: cachedData.short_english,
    },
    shortEnglish: cachedData.short_english,
  };
};

export const mapApiResponseToDefinition = (
  apiData: Record<string, unknown>
): { data: Record<string, unknown>; shortEnglish: string } => {
  const dataWithDef = apiData as { definition?: string };
  let shortEnglish =
    dataWithDef.definition && dataWithDef.definition.trim() !== ""
      ? dataWithDef.definition.trim()
      : "Translation unavailable";

  shortEnglish = truncateShortEnglish(shortEnglish);

  return {
    data: {
      ...apiData,
      shortEnglish,
    },
    shortEnglish,
  };
};
