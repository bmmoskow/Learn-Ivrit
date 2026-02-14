/**
 * Pure utility functions for TranslationPanel.
 *
 * IMPORTANT: This file is separate from useTranslationPanel.ts to avoid import side effects.
 * useTranslationPanel.ts imports supabase/client which initializes at import time and requires
 * VITE_SUPABASE_URL. Keeping pure functions here allows unit testing without mocking Supabase.
 */

export type TranslationDirection = "hebrew-to-english" | "english-to-hebrew";

/**
 * Detect whether text is primarily Hebrew or English based on character analysis
 * Returns the detected translation direction
 */
export const detectLanguage = (text: string): TranslationDirection => {
  // Count Hebrew characters (including vowel points)
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  // Count Latin alphabet characters
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;

  // If more Hebrew than Latin, assume Hebrew input → translate to English
  return hebrewChars >= latinChars ? "hebrew-to-english" : "english-to-hebrew";
};

/**
 * Check if text contains primarily Hebrew characters
 */
export const isHebrewText = (text: string): boolean => {
  return detectLanguage(text) === "hebrew-to-english";
};

/**
 * Remove HTML tags and decode HTML entities from text
 */
export const stripHtml = (text: string): string => {
  // Create a temporary div to decode HTML entities
  const temp = document.createElement("div");
  temp.innerHTML = text;
  const decoded = temp.textContent || temp.innerText || "";

  // Remove any remaining HTML tags and control characters
  // eslint-disable-next-line no-control-regex
  return decoded.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
};

/**
 * Remove Hebrew cantillation marks (trope/ta'amim) from text
 * Unicode ranges: U+0591-U+05AF, U+05BD, U+05BF, U+05C0, U+05C3-U+05C5
 */
export const removeTrope = (text: string): string => {
  return text.replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C5]/g, "");
};

/**
 * Clean a word by removing punctuation but preserving Hebrew marks
 * Preserves geresh (׳) and gershayim (״)
 */
export const cleanWord = (word: string): string => {
  let cleaned = word.trim();
  // Remove punctuation but preserve Hebrew marks: geresh (׳) and gershayim (״)
  cleaned = cleaned.replace(/[.,!?;:"'()[\]{}،؛؟]/g, "");
  return cleaned;
};

/**
 * Get the sentence context for a target word from text
 */
export const getSentenceContext = (text: string, targetWord: string): string => {
  const sentences = text.split(/[.!?؟،]+/);

  for (const sentence of sentences) {
    if (sentence.includes(targetWord)) {
      return sentence.trim();
    }
  }

  return text;
};

/**
 * Generate SHA-256 hash of text for caching purposes
 */
export const generateContentHash = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Sync Hebrew and English paragraphs for side-by-side display
 */
export interface SyncedParagraph {
  hebrew: string;
  english: string;
  index: number;
}

export const syncParagraphs = (hebrewText: string, englishText: string): SyncedParagraph[] | null => {
  if (!hebrewText) return null;

  const hebrewParagraphs = hebrewText.split(/\n\n+/);
  const englishParagraphs = englishText ? englishText.split(/\n\n+/) : [];

  // Merge extra English paragraphs if needed
  if (englishParagraphs.length > hebrewParagraphs.length) {
    const extraEnglish = englishParagraphs.slice(hebrewParagraphs.length).join("\n\n");
    if (hebrewParagraphs.length > 0 && extraEnglish.trim()) {
      englishParagraphs[hebrewParagraphs.length - 1] =
        (englishParagraphs[hebrewParagraphs.length - 1] || "") + "\n\n" + extraEnglish;
      englishParagraphs.length = hebrewParagraphs.length;
    }
  }

  return hebrewParagraphs.map((hebrewPara, paraIndex) => ({
    hebrew: hebrewPara,
    english: englishParagraphs[paraIndex] || "",
    index: paraIndex,
  }));
};

/**
 * Format Bible verses with verse numbers
 */
export const formatBibleVerses = (verses: string[]): string => {
  const versesWithNumbers = verses.map((verse: string, index: number) => {
    const cleanVerse = removeTrope(stripHtml(verse));
    return `(${index + 1}) ${cleanVerse}`;
  });
  return versesWithNumbers.join("\n\n");
};

/**
 * Check if navigation to previous chapter is possible
 */
export const canNavigatePrev = (currentBibleRef: { book: string; chapter: number } | null): boolean => {
  if (!currentBibleRef) return false;
  return currentBibleRef.chapter > 1;
};

/**
 * Check if navigation to next chapter is possible
 */
export const canNavigateNext = (
  currentBibleRef: { book: string; chapter: number } | null,
  bibleBooks: { name: string; chapters: number }[],
): boolean => {
  if (!currentBibleRef) return false;
  const currentBook = bibleBooks.find((b) => b.name === currentBibleRef.book);
  return currentBook ? currentBibleRef.chapter < currentBook.chapters : false;
};

/**
 * Split text into chunks for parallel translation.
 * Splits at paragraph boundaries first; if a paragraph exceeds maxChars,
 * falls back to sentence-level splitting within that paragraph.
 * Returns an array of text chunks, each ≤ maxChars (best effort).
 */
export const splitIntoChunks = (text: string, maxChars: number): string[] => {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/(?:\r?\n\s*){2,}/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const candidate = currentChunk ? currentChunk + "\n\n" + paragraph : paragraph;

    if (candidate.length <= maxChars) {
      currentChunk = candidate;
    } else {
      // Flush current chunk if non-empty
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      // If this single paragraph exceeds maxChars, split by sentences
      if (paragraph.length > maxChars) {
        const sentences = paragraph.match(/[^.!?؟]+[.!?؟]+|[^.!?؟]+$/g) || [paragraph];
        for (const sentence of sentences) {
          const sentenceCandidate = currentChunk ? currentChunk + " " + sentence : sentence;
          if (sentenceCandidate.length <= maxChars) {
            currentChunk = sentenceCandidate;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};
