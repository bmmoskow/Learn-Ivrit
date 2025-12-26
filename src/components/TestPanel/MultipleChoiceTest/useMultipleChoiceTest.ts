import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../../supabase/client";
import type { TestQuestion } from "../testPanelUtils";
import {
  checkMultipleChoiceAnswer,
  generateOptions,
  calculatePoolSize,
  isLastQuestion,
} from "./multipleChoiceTestUtils";

export interface UseMultipleChoiceTestProps {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
}

export interface UseMultipleChoiceTestReturn {
  options: string[];
  selectedAnswer: string | null;
  showFeedback: boolean;
  loading: boolean;
  isProcessing: boolean;
  handleSelect: (answer: string) => void;
}

const FEEDBACK_DELAY_MS = 1500;
const OPTIONS_COUNT = 4;

export function useMultipleChoiceTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: UseMultipleChoiceTestProps): UseMultipleChoiceTestReturn {
  const { user, isGuest } = useAuth();
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchDistractorPool = async () => {
      setLoading(true);
      setSelectedAnswer(null);
      setShowFeedback(false);

      const correctAnswer = question.word.english_translation;

      if (isGuest) {
        setOptions([correctAnswer]);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const poolSize = calculatePoolSize(totalQuestions, OPTIONS_COUNT);
        const { data: vocabData, error } = await supabase.rpc("select_test_words", {
          p_user_id: user.id,
          p_limit: poolSize,
        });

        if (error) {
          console.error("Error fetching distractor pool:", error);
          setOptions([correctAnswer]);
        } else if (vocabData && vocabData.length > 0) {
          const allTranslations = vocabData.map((word: { english_translation: string }) => word.english_translation);
          const generatedOptions = generateOptions(
            correctAnswer,
            allTranslations,
            OPTIONS_COUNT
          );
          setOptions(generatedOptions);
        } else {
          setOptions([correctAnswer]);
        }
      } catch (err) {
        console.error("Error in fetchDistractorPool:", err);
        setOptions([correctAnswer]);
      }

      setLoading(false);
    };

    fetchDistractorPool();
  }, [question, user, isGuest, totalQuestions]);

  const handleSelect = useCallback(
    (answer: string) => {
      if (showFeedback) return;

      setSelectedAnswer(answer);
      setShowFeedback(true);

      const isCorrect = checkMultipleChoiceAnswer(answer, question.word.english_translation);

      if (isLastQuestion(questionNumber, totalQuestions)) {
        setIsProcessing(true);
      }

      setTimeout(() => {
        onAnswer(answer, isCorrect);
      }, FEEDBACK_DELAY_MS);
    },
    [showFeedback, question.word.english_translation, questionNumber, totalQuestions, onAnswer]
  );

  return {
    options,
    selectedAnswer,
    showFeedback,
    loading,
    isProcessing,
    handleSelect,
  };
}
