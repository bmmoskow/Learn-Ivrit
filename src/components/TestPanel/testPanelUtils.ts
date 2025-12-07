import type { WordWithStats } from "../../utils/adaptiveAlgorithm";

export type TestType = "flashcard" | "multiple_choice" | "fill_in_blank";

export type TestQuestion = {
  word: WordWithStats;
  userAnswer?: string;
  isCorrect?: boolean;
  responseTime?: number;
};

export interface TestStatistic {
  [key: string]: string | number;
  word_id: string;
  correct_count: number;
  incorrect_count: number;
  total_attempts: number;
  consecutive_correct: number;
  last_tested: string;
  confidence_score: number;
}

export interface TestResponse {
  [key: string]: string | number | boolean | undefined;
  word_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  response_time_seconds: number | undefined;
}

export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 50;

/**
 * Creates a guest word with default statistics
 */
export function createGuestWord(
  word: { hebrew: string; english: string },
  index: number
): WordWithStats {
  const now = new Date().toISOString();
  return {
    id: `guest-${index}`,
    user_id: "guest",
    hebrew_word: word.hebrew,
    english_translation: word.english,
    definition: word.english,
    transliteration: "",
    created_at: now,
    updated_at: now,
    statistics: {
      id: `guest-stats-${index}`,
      user_id: "guest",
      word_id: `guest-${index}`,
      correct_count: 0,
      incorrect_count: 0,
      total_attempts: 0,
      consecutive_correct: 0,
      last_tested: null,
      confidence_score: 0,
      created_at: now,
      updated_at: now,
    },
  };
}

/**
 * Creates a word with default empty statistics from vocabulary data
 */
export function createWordWithEmptyStats(word: {
  id: string;
  user_id: string;
  hebrew_word: string;
  english_translation: string;
  definition: string;
  transliteration: string | null;
  created_at: string | null;
  updated_at: string | null;
}): WordWithStats {
  const now = new Date().toISOString();
  return {
    ...word,
    transliteration: word.transliteration || "",
    created_at: word.created_at || now,
    updated_at: word.updated_at || now,
    statistics: {
      id: "",
      user_id: word.user_id,
      word_id: word.id,
      correct_count: 0,
      incorrect_count: 0,
      total_attempts: 0,
      consecutive_correct: 0,
      last_tested: null,
      confidence_score: 0,
      created_at: now,
      updated_at: now,
    },
  };
}

/**
 * Calculates the effective question count based on available words
 */
export function calculateEffectiveQuestionCount(
  requestedCount: number,
  availableWords: number
): number {
  return Math.min(requestedCount, availableWords);
}

/**
 * Calculates the maximum question count based on available words
 */
export function calculateMaxQuestionCount(availableWords: number): number {
  return Math.min(MAX_QUESTIONS, availableWords);
}

/**
 * Creates test questions from selected words
 */
export function createTestQuestions(words: WordWithStats[]): TestQuestion[] {
  return words.map((word) => ({ word }));
}

/**
 * Creates test responses for saving to database
 */
export function createTestResponses(
  completedTest: TestQuestion[]
): TestResponse[] {
  return completedTest.map((question) => ({
    word_id: question.word.id,
    user_answer: question.userAnswer || "",
    correct_answer: question.word.english_translation,
    is_correct: question.isCorrect || false,
    response_time_seconds: question.responseTime,
  }));
}

/**
 * Creates test statistics for saving to database
 */
export function createTestStatistics(
  completedTest: TestQuestion[],
  timestamp: string,
  calculateConfidenceScore: (stats: {
    correct_count: number;
    incorrect_count: number;
    total_attempts: number;
    consecutive_correct: number;
  }) => number
): TestStatistic[] {
  return completedTest.map((question) => {
    const stats = question.word.statistics;
    const newCorrectCount =
      (stats?.correct_count || 0) + (question.isCorrect ? 1 : 0);
    const newIncorrectCount =
      (stats?.incorrect_count || 0) + (question.isCorrect ? 0 : 1);
    const newTotalAttempts = (stats?.total_attempts || 0) + 1;
    const newConsecutiveCorrect = question.isCorrect
      ? (stats?.consecutive_correct || 0) + 1
      : 0;

    const newConfidenceScore = calculateConfidenceScore({
      correct_count: newCorrectCount,
      incorrect_count: newIncorrectCount,
      total_attempts: newTotalAttempts,
      consecutive_correct: newConsecutiveCorrect,
    });

    return {
      word_id: question.word.id,
      correct_count: newCorrectCount,
      incorrect_count: newIncorrectCount,
      total_attempts: newTotalAttempts,
      consecutive_correct: newConsecutiveCorrect,
      last_tested: timestamp,
      confidence_score: newConfidenceScore,
    };
  });
}

/**
 * Calculates test score percentage
 */
export function calculateScorePercentage(
  correctCount: number,
  totalQuestions: number
): number {
  if (totalQuestions === 0) return 0;
  return (correctCount / totalQuestions) * 100;
}

/**
 * Counts correct answers in a completed test
 */
export function countCorrectAnswers(completedTest: TestQuestion[]): number {
  return completedTest.filter((q) => q.isCorrect).length;
}

/**
 * Calculates test duration in seconds
 */
export function calculateTestDuration(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Calculates response time for a question in seconds
 */
export function calculateResponseTime(questionStartTime: number): number {
  return Math.floor((Date.now() - questionStartTime) / 1000);
}

/**
 * Updates a question with the user's answer
 */
export function updateQuestionWithAnswer(
  questions: TestQuestion[],
  questionIndex: number,
  answer: string,
  isCorrect: boolean,
  responseTime: number
): TestQuestion[] {
  const updatedQuestions = [...questions];
  updatedQuestions[questionIndex] = {
    ...updatedQuestions[questionIndex],
    userAnswer: answer,
    isCorrect,
    responseTime,
  };
  return updatedQuestions;
}

/**
 * Checks if there are more questions remaining
 */
export function hasMoreQuestions(
  currentIndex: number,
  totalQuestions: number
): boolean {
  return currentIndex < totalQuestions - 1;
}

/**
 * Maps RPC response to WordWithStats format
 */
export function mapRpcWordToWordWithStats(word: any): WordWithStats {
  return {
    ...word,
    statistics: word.stats,
  };
}
