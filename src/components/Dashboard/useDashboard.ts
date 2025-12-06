import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import type { Tables } from "../../../supabase/types";

type VocabularyWord = Tables<"vocabulary_words">;
type WordStatistics = Tables<"word_statistics">;
type UserTest = Tables<"user_tests">;

export interface DashboardStats {
  totalWords: number;
  testsCompleted: number;
  averageScore: number;
  weakWords: Array<VocabularyWord & { statistics: WordStatistics }>;
  recentTests: UserTest[];
  studyStreak: number;
}

export interface UseDashboardState {
  stats: DashboardStats;
  loading: boolean;
}

export interface UseDashboardActions {
  loadDashboardData: () => Promise<void>;
}

export type UseDashboardReturn = UseDashboardState & UseDashboardActions;

export function calculateStudyStreak(tests: UserTest[], today: Date = new Date()): number {
  if (tests.length === 0) return 0;

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const testDates = tests
    .map((test) => {
      const date = new Date(test.completed_at);
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

export function calculateAverageScore(tests: UserTest[]): number {
  if (tests.length === 0) return 0;
  return Math.round(
    tests.reduce((sum, test) => sum + test.score_percentage, 0) / tests.length
  );
}

export function transformWeakWordsData(
  weakWordsData: Array<{
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
    vocabulary_words: VocabularyWord | VocabularyWord[] | null;
  }> | null
): Array<VocabularyWord & { statistics: WordStatistics }> {
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
    })) as Array<VocabularyWord & { statistics: WordStatistics }>;
}

const initialStats: DashboardStats = {
  totalWords: 0,
  testsCompleted: 0,
  averageScore: 0,
  weakWords: [],
  recentTests: [],
  studyStreak: 0,
};

export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [wordsResult, weakWordsResult, testsResult] = await Promise.all([
        supabase.from("vocabulary_words").select("id").eq("user_id", user.id).limit(1000),
        supabase
          .from("word_statistics")
          .select(
            `
            id,
            user_id,
            word_id,
            correct_count,
            incorrect_count,
            total_attempts,
            consecutive_correct,
            last_tested,
            confidence_score,
            created_at,
            updated_at,
            vocabulary_words (
              id,
              user_id,
              hebrew_word,
              english_translation,
              definition,
              transliteration,
              created_at,
              updated_at
            )
          `,
          )
          .eq("user_id", user.id)
          .order("confidence_score", { ascending: true })
          .limit(5),
        supabase
          .from("user_tests")
          .select(
            "id, user_id, test_type, total_questions, correct_answers, score_percentage, duration_seconds, completed_at, created_at",
          )
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(5),
      ]);

      const { data: wordsData } = wordsResult;
      const { data: weakWordsData } = weakWordsResult;
      const { data: testsData } = testsResult;

      const weakWords = transformWeakWordsData(weakWordsData);
      const averageScore = calculateAverageScore(testsData || []);
      const studyStreak = calculateStudyStreak(testsData || []);

      setStats({
        totalWords: wordsData?.length || 0,
        testsCompleted: testsData?.length || 0,
        averageScore,
        weakWords,
        recentTests: testsData || [],
        studyStreak,
      });
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    stats,
    loading,
    loadDashboardData,
  };
}
