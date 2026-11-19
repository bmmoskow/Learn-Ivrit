import type { WordWithStats } from "../../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";

/**
 * Pure helpers for the Vocabulary flashcard review.
 *
 * Review is a no-writes, flip-through practice mode: these functions only move a
 * cursor through an already-selected deck and describe the progress bar. There is
 * no scoring here on purpose — mastery is only ever updated by taking a real test.
 */

export interface FlashcardReviewProps {
  /** Called when the user leaves review and returns to the vocabulary list. */
  onExit: () => void;
}

/** How many adaptively-weighted words a single review session drills. */
export const REVIEW_WORD_COUNT = 20;

/** Whether there is a previous card to step back to. */
export function canGoPrevious(currentIndex: number): boolean {
  return currentIndex > 0;
}

/** Whether there is a next card to advance to. */
export function canGoNext(currentIndex: number, totalCards: number): boolean {
  return currentIndex < totalCards - 1;
}

/** Clamped next-card index (never runs past the end of the deck). */
export function getNextIndex(currentIndex: number, totalCards: number): number {
  return Math.min(currentIndex + 1, totalCards - 1);
}

/** Clamped previous-card index (never runs before the start of the deck). */
export function getPreviousIndex(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0);
}

/**
 * Classifies a progress-dot by position relative to the current card. Mirrors the
 * old flashcard test's dots, but keyed off a zero-based index since review has no
 * "question number".
 */
export function getProgressBarStatus(
  index: number,
  currentIndex: number
): "completed" | "current" | "pending" {
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "pending";
}

/** The best single English string to reveal for a word (translation, then definition). */
export function getRevealText(word: WordWithStats): string {
  return word.english_translation || word.definition || "";
}
