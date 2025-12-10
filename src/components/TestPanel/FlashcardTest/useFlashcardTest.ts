import { useState, useEffect, useCallback } from "react";
import type { TestQuestion } from "../testPanelUtils";
import { isLastQuestion } from "./flashcardTestUtils";

export interface UseFlashcardTestProps {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
}

export interface UseFlashcardTestReturn {
  showAnswer: boolean;
  isProcessing: boolean;
  handleShowAnswer: () => void;
  handleCorrect: () => void;
  handleIncorrect: () => void;
}

const FEEDBACK_DELAY_MS = 500;

export function useFlashcardTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: UseFlashcardTestProps): UseFlashcardTestReturn {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isProcessing) {
      setShowAnswer(false);
    }
  }, [question, isProcessing]);

  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleCorrect = useCallback(() => {
    if (isLastQuestion(questionNumber, totalQuestions)) {
      setIsProcessing(true);
    }

    setTimeout(() => {
      onAnswer(question.word.english_translation, true);
    }, FEEDBACK_DELAY_MS);
  }, [question.word.english_translation, questionNumber, totalQuestions, onAnswer]);

  const handleIncorrect = useCallback(() => {
    if (isLastQuestion(questionNumber, totalQuestions)) {
      setIsProcessing(true);
    }

    setTimeout(() => {
      onAnswer("", false);
    }, FEEDBACK_DELAY_MS);
  }, [questionNumber, totalQuestions, onAnswer]);

  return {
    showAnswer,
    isProcessing,
    handleShowAnswer,
    handleCorrect,
    handleIncorrect,
  };
}
