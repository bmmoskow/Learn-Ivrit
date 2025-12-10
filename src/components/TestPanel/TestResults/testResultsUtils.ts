import type { TestQuestion, TestType } from "../testPanelUtils";

export interface TestResultsProps {
  test: TestQuestion[];
  testType: TestType;
  onRetakeTest: () => void;
  onNewTest: () => void;
}

export function calculateScorePercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

export function countCorrectAnswers(test: TestQuestion[]): number {
  return test.filter((q) => q.isCorrect).length;
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-500";
  if (percentage >= 60) return "text-yellow-500";
  return "text-red-500";
}

export function getScoreMessage(percentage: number): string {
  if (percentage >= 90) return "Excellent work!";
  if (percentage >= 80) return "Great job!";
  if (percentage >= 70) return "Good effort!";
  if (percentage >= 60) return "Keep practicing!";
  return "Don't give up!";
}

export function getTestTypeLabel(testType: TestType): string {
  switch (testType) {
    case "flashcard":
      return "Flashcard";
    case "multiple_choice":
      return "Multiple Choice";
    case "fill_in_blank":
      return "Fill in the Blank";
    default:
      return "Unknown";
  }
}
