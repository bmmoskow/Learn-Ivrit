import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../../supabase/client";
import { defaultVocabulary } from "../../../data/defaultVocabulary";
import type { WordWithStats } from "../../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";
import { selectAdaptiveWords } from "../../../utils/adaptiveAlgorithm/selectAdaptiveWords";
import { createGuestVocabWord } from "../vocabularyListUtils";
import {
  REVIEW_WORD_COUNT,
  canGoNext,
  canGoPrevious,
  getNextIndex,
  getPreviousIndex,
} from "./flashcardReviewUtils";

export interface UseFlashcardReviewReturn {
  // State
  words: WordWithStats[];
  loading: boolean;
  currentIndex: number;
  showAnswer: boolean;

  // Derived
  currentWord: WordWithStats | null;
  hasNext: boolean;
  hasPrevious: boolean;

  // Actions
  revealAnswer: () => void;
  hideAnswer: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
}

/**
 * Drives the Vocabulary flashcard review.
 *
 * Crucially this hook performs NO database writes: it never touches `user_tests`,
 * `test_responses` or `word_statistics`. It only READS — it reuses the shared
 * `selectAdaptiveWords` helper (the same selection the TestPanel uses) to surface
 * the user's weakest words, then flips through them. Because nothing is scored,
 * the same weak words will keep reappearing across sessions; the UI explains that
 * taking a real test is what updates mastery.
 */
export function useFlashcardReview(): UseFlashcardReviewReturn {
  const { user, isGuest } = useAuth();
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const loadReviewWords = useCallback(async () => {
    setLoading(true);

    try {
      if (isGuest) {
        // Guests drill the sample deck entirely client-side — no account, no
        // stats, no writes. selectAdaptiveWords weights by the (empty) stats,
        // which for guests is effectively a weighted shuffle.
        const guestPool: WordWithStats[] = defaultVocabulary.map((word, index) =>
          createGuestVocabWord(word, index)
        );
        const selected = await selectAdaptiveWords({
          isGuest: true,
          userId: null,
          words: guestPool,
          count: REVIEW_WORD_COUNT,
        });
        setWords(selected);
        return;
      }

      if (!user) {
        setWords([]);
        return;
      }

      // Authenticated: the `select_test_words` RPC does the adaptive ranking
      // server-side. We still fetch the raw vocabulary as a pool so the shared
      // helper has something to fall back on if the RPC errors.
      const { data: vocabData, error } = await supabase
        .from("vocabulary_words")
        .select(
          "id, user_id, hebrew_word, english_translation, definition, transliteration, created_at, updated_at"
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading review vocabulary:", error);
        setWords([]);
        return;
      }

      // The pool only backstops the RPC, so leaving statistics undefined is fine.
      const pool = (vocabData ?? []) as WordWithStats[];
      const selected = await selectAdaptiveWords({
        isGuest: false,
        userId: user.id,
        words: pool,
        count: REVIEW_WORD_COUNT,
      });
      setWords(selected);
    } catch (err) {
      console.error("Error loading review vocabulary:", err);
      setWords([]);
    } finally {
      setLoading(false);
      // Always start a fresh session at the first card, face down.
      setCurrentIndex(0);
      setShowAnswer(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    loadReviewWords();
  }, [loadReviewWords]);

  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  // Lets the single toggle button re-hide the translation, so a learner can
  // self-quiz on the same card without advancing.
  const hideAnswer = useCallback(() => {
    setShowAnswer(false);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((index) => getNextIndex(index, words.length));
    setShowAnswer(false);
  }, [words.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((index) => getPreviousIndex(index));
    setShowAnswer(false);
  }, []);

  const currentWord = words.length > 0 ? words[currentIndex] : null;

  return {
    // State
    words,
    loading,
    currentIndex,
    showAnswer,

    // Derived
    currentWord,
    hasNext: canGoNext(currentIndex, words.length),
    hasPrevious: canGoPrevious(currentIndex),

    // Actions
    revealAnswer,
    hideAnswer,
    goToNext,
    goToPrevious,
  };
}
