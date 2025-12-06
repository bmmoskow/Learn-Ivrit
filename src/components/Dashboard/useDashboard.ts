import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import type { Tables } from "../../../supabase/types";
import {
  calculateStudyStreak,
  calculateAverageScore,
  transformWeakWordsData,
} from "./dashboardUtils";

// Re-export utilities for backward compatibility
export { calculateStudyStreak, formatTestType, formatDate, calculateAverageScore, transformWeakWordsData } from "./dashboardUtils";

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
