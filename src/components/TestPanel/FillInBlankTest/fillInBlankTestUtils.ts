/**
 * Pure utility functions for FillInBlankTest.
 *
 * IMPORTANT: This file is separate from useFillInBlankTest.ts to avoid import side effects.
 * Keeping pure functions here allows unit testing without mocking external dependencies.
 */

import type { TestQuestion } from "../testPanelUtils";

/**
 * Props for the FillInBlankTest component
 */
export type FillInBlankTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

/**
 * Check if user input matches the correct answer (case-insensitive, trimmed)
 */
export function checkFillInBlankAnswer(userInput: string, correctAnswer: string): boolean {
  return userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(questionNumber: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return (questionNumber / totalQuestions) * 100;
}

/**
 * Check if current question is the last one
 */
export function isLastQuestion(questionNumber: number, totalQuestions: number): boolean {
  return questionNumber === totalQuestions;
}

/**
 * Validate user input is non-empty after trimming
 */
export function isValidInput(input: string): boolean {
  return input.trim().length > 0;
}
