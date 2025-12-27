import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import {
  selectTestWords,
  calculateConfidenceScore,
  shuffleArray,
  WordWithStats,
} from "../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";
import { defaultVocabulary } from "../../data/defaultVocabulary";
import {
  TestType,
  TestQuestion,
  MIN_QUESTIONS,
  createGuestWord,
  createWordWithEmptyStats,
  calculateEffectiveQuestionCount,
  calculateMaxQuestionCount,
  createTestQuestions,
  createTestResponses,
  createTestStatistics,
  calculateScorePercentage,
  countCorrectAnswers,
  calculateTestDuration,
  calculateResponseTime,
  updateQuestionWithAnswer,
  hasMoreQuestions,
  mapRpcWordToWordWithStats,
} from "./testPanelUtils";

export interface UseTestPanelReturn {
  // State
  words: WordWithStats[];
  loading: boolean;
  testType: TestType | null;
  questionCount: number;
  currentTest: TestQuestion[];
  currentQuestionIndex: number;
  showResults: boolean;
  testId: string | null;

  // Derived
  currentQuestion: TestQuestion | null;
  maxQuestionCount: number;
  minQuestionCount: number;

  // Actions
  setQuestionCount: (count: number) => void;
  startTest: (type: TestType) => Promise<void>;
  handleAnswer: (answer: string, isCorrect: boolean) => void;
  resetTest: () => void;
}

export function useTestPanel(): UseTestPanelReturn {
  const { user, isGuest } = useAuth();
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [testType, setTestType] = useState<TestType | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [currentTest, setCurrentTest] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);

  const loadVocabulary = useCallback(async () => {
    if (isGuest) {
      const guestWords: WordWithStats[] = defaultVocabulary.map(
        (word, index) => createGuestWord(word, index)
      );
      setWords(guestWords);
      setLoading(false);
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      const { data: vocabData, error } = await supabase
        .from("vocabulary_words")
        .select(
          "id, user_id, hebrew_word, english_translation, definition, transliteration, created_at, updated_at"
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading vocabulary:", error);
        setWords([]);
      } else {
        const wordsWithStats: WordWithStats[] = vocabData.map((word) =>
          createWordWithEmptyStats(word)
        );
        setWords(wordsWithStats);
      }
    } catch (err) {
      console.error("Error loading vocabulary:", err);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  const startTest = useCallback(
    async (type: TestType) => {
      if (words.length === 0) return;

      const count = calculateEffectiveQuestionCount(questionCount, words.length);
      let selectedWords: WordWithStats[];

      if (isGuest) {
        selectedWords = selectTestWords(words, count);
      } else {
        if (!user) return;

        try {
          const { data: vocabData, error } = await supabase.rpc(
            "select_test_words",
            {
              p_user_id: user.id,
              p_limit: count,
            }
          );

          if (error) {
            console.error("Error fetching test words:", error);
            selectedWords = selectTestWords(
              words.filter((w) => w !== null),
              count
            );
          } else {
            const lowConfidenceWords = (vocabData as Array<Record<string, unknown> & { stats?: unknown }>).map((word) =>
              mapRpcWordToWordWithStats(word)
            );
            selectedWords = shuffleArray([...lowConfidenceWords]);
          }
        } catch (err) {
          console.error("Error in startTest:", err);
          return;
        }
      }

      const questions = createTestQuestions(selectedWords);

      setTestType(type);
      setCurrentTest(questions);
      setCurrentQuestionIndex(0);
      setTestStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setShowResults(false);
    },
    [words, questionCount, isGuest, user]
  );

  const saveTestResultsAsync = useCallback(
    (completedTest: TestQuestion[]) => {
      if (isGuest || !user || !testType) return;

      const correctCount = countCorrectAnswers(completedTest);
      const totalQuestions = completedTest.length;
      const scorePercentage = calculateScorePercentage(
        correctCount,
        totalQuestions
      );
      const durationSeconds = calculateTestDuration(testStartTime);
      const timestamp = new Date().toISOString();

      const responses = createTestResponses(completedTest);
      const statistics = createTestStatistics(
        completedTest,
        timestamp,
        calculateConfidenceScore
      );

      supabase
        .rpc("save_complete_test_results", {
          p_user_id: user.id,
          p_test_type: testType,
          p_total_questions: totalQuestions,
          p_correct_answers: correctCount,
          p_score_percentage: scorePercentage,
          p_duration_seconds: durationSeconds,
          p_responses: responses,
          p_statistics: statistics,
        })
        .then(({ data: savedTestId, error }) => {
          if (error) {
            console.error("Error saving test results:", error);
          } else {
            setTestId(savedTestId);
          }
        });
    },
    [isGuest, user, testType, testStartTime]
  );

  const finishTest = useCallback(
    async (completedTest: TestQuestion[]) => {
      const minDisplayTime = new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );

      await minDisplayTime;
      setShowResults(true);

      if (!isGuest && user) {
        saveTestResultsAsync(completedTest);
      }
    },
    [isGuest, user, saveTestResultsAsync]
  );

  const handleAnswer = useCallback(
    (answer: string, isCorrect: boolean) => {
      const responseTime = calculateResponseTime(questionStartTime);

      const updatedQuestions = updateQuestionWithAnswer(
        currentTest,
        currentQuestionIndex,
        answer,
        isCorrect,
        responseTime
      );

      setCurrentTest(updatedQuestions);

      if (hasMoreQuestions(currentQuestionIndex, currentTest.length)) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setQuestionStartTime(Date.now());
      } else {
        finishTest(updatedQuestions);
      }
    },
    [currentTest, currentQuestionIndex, questionStartTime, finishTest]
  );

  const resetTest = useCallback(() => {
    setTestType(null);
    setCurrentTest([]);
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setTestId(null);
    loadVocabulary();
  }, [loadVocabulary]);

  const currentQuestion =
    currentTest.length > 0 ? currentTest[currentQuestionIndex] : null;

  const maxQuestionCount = calculateMaxQuestionCount(words.length);

  return {
    // State
    words,
    loading,
    testType,
    questionCount,
    currentTest,
    currentQuestionIndex,
    showResults,
    testId,

    // Derived
    currentQuestion,
    maxQuestionCount,
    minQuestionCount: MIN_QUESTIONS,

    // Actions
    setQuestionCount,
    startTest,
    handleAnswer,
    resetTest,
  };
}
