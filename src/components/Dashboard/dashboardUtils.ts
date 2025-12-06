// Pure helper functions for Dashboard - no external dependencies
// This file can be safely imported in tests without Supabase client initialization

export interface UserTestData {
  id: string;
  user_id: string;
  test_type: string;
  total_questions: number | null;
  correct_answers: number | null;
  score_percentage: number | null;
  duration_seconds: number | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface VocabularyWordData {
  id: string;
  user_id: string;
  hebrew_word: string;
  english_translation: string;
  definition: string;
  transliteration: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WordStatisticsData {
  id: string;
  user_id: string;
  word_id: string;
  correct_count: number | null;
  incorrect_count: number | null;
  total_attempts: number | null;
  consecutive_correct: number | null;
  last_tested: string | null;
  confidence_score: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WeakWordInput {
  id: string;
  user_id: string;
  word_id: string;
  correct_count: number | null;
  incorrect_count: number | null;
  total_attempts: number | null;
  consecutive_correct: number | null;
  last_tested: string | null;
  confidence_score: number | null;
  created_at: string | null;
  updated_at: string | null;
  vocabulary_words: VocabularyWordData | VocabularyWordData[] | null;
}

export function calculateStudyStreak(tests: UserTestData[], today: Date = new Date()): number {
  if (tests.length === 0) return 0;

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const testDates = tests
    .filter((test) => test.completed_at)
    .map((test) => {
      const date = new Date(test.completed_at!);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => b - a);

  let streak = 0;
  let currentDate = todayStart.getTime();

  for (const testDate of testDates) {
    if (testDate === currentDate) {
      streak++;
      currentDate -= 24 * 60 * 60 * 1000;
    } else if (testDate < currentDate) {
      break;
    }
  }

  return streak;
}

export function formatTestType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDate(dateString: string, now: Date = new Date()): string {
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function calculateAverageScore(tests: UserTestData[]): number {
  const testsWithScores = tests.filter((t) => t.score_percentage !== null);
  if (testsWithScores.length === 0) return 0;
  return Math.round(
    testsWithScores.reduce((sum, test) => sum + (test.score_percentage || 0), 0) / testsWithScores.length
  );
}

export function transformWeakWordsData(
  weakWordsData: WeakWordInput[] | null
): Array<VocabularyWordData & { statistics: WordStatisticsData }> {
  if (!weakWordsData) return [];

  return weakWordsData
    .filter((item) => item.vocabulary_words)
    .map((item) => ({
      ...(Array.isArray(item.vocabulary_words) ? item.vocabulary_words[0] : item.vocabulary_words),
      statistics: {
        id: item.id,
        user_id: item.user_id,
        word_id: item.word_id,
        correct_count: item.correct_count,
        incorrect_count: item.incorrect_count,
        total_attempts: item.total_attempts,
        consecutive_correct: item.consecutive_correct,
        last_tested: item.last_tested,
        confidence_score: item.confidence_score,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
    })) as Array<VocabularyWordData & { statistics: WordStatisticsData }>;
}
