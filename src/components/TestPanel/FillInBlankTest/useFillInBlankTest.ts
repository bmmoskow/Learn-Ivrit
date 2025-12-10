import { useState, useEffect, useRef, useCallback } from "react";
import type { TestQuestion } from "../testPanelUtils";
import {
  checkFillInBlankAnswer,
  isLastQuestion,
  isValidInput,
} from "./fillInBlankTestUtils";

export interface UseFillInBlankTestProps {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
}

export interface UseFillInBlankTestReturn {
  // State
  userInput: string;
  showFeedback: boolean;
  isCorrect: boolean;
  isProcessing: boolean;
  inputRef: React.RefObject<HTMLInputElement>;

  // Actions
  setUserInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const FEEDBACK_DELAY_MS = 2000;

export function useFillInBlankTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: UseFillInBlankTestProps): UseFillInBlankTestReturn {
  const [userInput, setUserInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when question changes
  useEffect(() => {
    if (!isProcessing) {
      setUserInput("");
      setShowFeedback(false);
      inputRef.current?.focus();
    }
  }, [question, isProcessing]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!isValidInput(userInput) || showFeedback) return;

      const correct = checkFillInBlankAnswer(userInput, question.word.english_translation);
      const answer = userInput.trim();

      setIsCorrect(correct);
      setShowFeedback(true);

      if (isLastQuestion(questionNumber, totalQuestions)) {
        setIsProcessing(true);
      }

      setTimeout(() => {
        onAnswer(answer, correct);
      }, FEEDBACK_DELAY_MS);
    },
    [userInput, showFeedback, question.word.english_translation, questionNumber, totalQuestions, onAnswer]
  );

  return {
    userInput,
    showFeedback,
    isCorrect,
    isProcessing,
    inputRef,
    setUserInput,
    handleSubmit,
  };
}
