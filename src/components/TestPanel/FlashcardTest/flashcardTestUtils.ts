import type { TestQuestion } from "../testPanelUtils";

export type FlashcardTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

export function calculateProgress(questionNumber: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return (questionNumber / totalQuestions) * 100;
}

export function isLastQuestion(questionNumber: number, totalQuestions: number): boolean {
  return questionNumber === totalQuestions;
}

export function getProgressBarStatus(index: number, currentQuestionNumber: number): 'completed' | 'current' | 'pending' {
  if (index < currentQuestionNumber - 1) return 'completed';
  if (index === currentQuestionNumber - 1) return 'current';
  return 'pending';
}
