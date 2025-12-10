/**
 * Pure utility functions for MultipleChoiceTest.
 *
 * IMPORTANT: This file is separate from useMultipleChoiceTest.ts to avoid import side effects.
 * Keeping pure functions here allows unit testing without mocking external dependencies.
 */

import type { TestQuestion } from "../testPanelUtils";

/**
 * Props for the MultipleChoiceTest component
 */
export type MultipleChoiceTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

/**
 * Check if the selected option is correct
 */
export function checkMultipleChoiceAnswer(
  selectedOption: string,
  correctAnswer: string
): boolean {
  return selectedOption === correctAnswer;
}

/**
 * Generate distractor options by selecting wrong answers and shuffling with correct answer
 */
export function generateOptions(
  correctAnswer: string,
  allTranslations: string[],
  count: number = 4
): string[] {
  const otherTranslations = allTranslations.filter(
    (translation) => translation !== correctAnswer
  );

  const wrongAnswers = shuffleArray(otherTranslations).slice(0, count - 1);

  return shuffleArray([correctAnswer, ...wrongAnswers]);
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate the pool size needed for generating distractors across all questions
 */
export function calculatePoolSize(totalQuestions: number, optionsPerQuestion: number = 4): number {
  return totalQuestions * optionsPerQuestion;
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
 * Get button styling classes based on state
 */
export function getOptionButtonClasses(
  isSelected: boolean,
  isCorrect: boolean,
  showFeedback: boolean
): string {
  const baseClasses = "w-full p-5 text-left text-lg rounded-xl border-2 transition ";

  if (showFeedback) {
    if (isCorrect) {
      return baseClasses + "border-green-600 bg-green-50 text-green-900";
    } else if (isSelected && !isCorrect) {
      return baseClasses + "border-red-600 bg-red-50 text-red-900";
    } else {
      return baseClasses + "border-gray-200 bg-gray-50 text-gray-500";
    }
  }

  return baseClasses + "border-gray-300 hover:border-green-500 hover:bg-green-50 cursor-pointer";
}
