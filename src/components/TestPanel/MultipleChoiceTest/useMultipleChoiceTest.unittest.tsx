import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMultipleChoiceTest } from "./useMultipleChoiceTest";
import type { TestQuestion } from "../testPanelUtils";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const mockQuestion: TestQuestion = {
  word: {
    id: "word-1",
    user_id: "user-123",
    hebrew_word: "שָׁלוֹם",
    english_translation: "peace",
    definition: "a state of tranquility",
    transliteration: "shalom",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  stats: {
    id: "stat-1",
    user_id: "user-123",
    word_id: "word-1",
    correct_count: 5,
    incorrect_count: 2,
    total_attempts: 7,
    consecutive_correct: 2,
    last_tested: null,
    confidence_score: 65,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

vi.mock("../../../contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isGuest: false,
  })),
}));

vi.mock("../../../../supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const { useAuth } = await import("../../../contexts/AuthContext/AuthContext");
const { supabase } = await import("../../../../supabase/client");

describe("useMultipleChoiceTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isGuest: false,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  describe("initialization", () => {
    it("starts in loading state", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.options).toEqual([]);
      expect(result.current.selectedAnswer).toBeNull();
      expect(result.current.showFeedback).toBe(false);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("loads options from database for authenticated user", async () => {
      const mockVocabData = [
        { english_translation: "peace" },
        { english_translation: "war" },
        { english_translation: "love" },
        { english_translation: "hate" },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockVocabData,
        error: null,
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.options).toHaveLength(4);
      expect(result.current.options).toContain("peace");
      expect(supabase.rpc).toHaveBeenCalledWith("select_test_words", {
        p_user_id: "user-123",
        p_limit: 40,
      });
    });

    it("shows only correct answer for guest users", async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isGuest: true,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        updatePassword: vi.fn(),
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.options).toEqual(["peace"]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("handles database error gracefully", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.options).toEqual(["peace"]);
    });

    it("handles empty database response", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.options).toEqual(["peace"]);
    });
  });

  describe("handleSelect", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it("sets selected answer and shows feedback", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [
          { english_translation: "peace" },
          { english_translation: "war" },
        ],
        error: null,
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSelect("peace");
      });

      expect(result.current.selectedAnswer).toBe("peace");
      expect(result.current.showFeedback).toBe(true);
    });

    it("calls onAnswer with correct result after delay", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ english_translation: "peace" }],
        error: null,
      });

      const onAnswer = vi.fn();

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer,
        })
      );

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSelect("peace");
      });

      expect(onAnswer).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onAnswer).toHaveBeenCalledWith("peace", true);
    });

    it("calls onAnswer with incorrect result for wrong answer", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [
          { english_translation: "peace" },
          { english_translation: "war" },
        ],
        error: null,
      });

      const onAnswer = vi.fn();

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer,
        })
      );

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSelect("war");
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onAnswer).toHaveBeenCalledWith("war", false);
    });

    it("prevents multiple selections when feedback is shown", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [
          { english_translation: "peace" },
          { english_translation: "war" },
        ],
        error: null,
      });

      const onAnswer = vi.fn();

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 1,
          totalQuestions: 10,
          onAnswer,
        })
      );

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSelect("peace");
      });

      const firstSelection = result.current.selectedAnswer;

      act(() => {
        result.current.handleSelect("war");
      });

      expect(result.current.selectedAnswer).toBe(firstSelection);
    });

    it("sets isProcessing on last question", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ english_translation: "peace" }],
        error: null,
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 10,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSelect("peace");
      });

      expect(result.current.isProcessing).toBe(true);
    });

    it("does not set isProcessing on non-last question", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ english_translation: "peace" }],
        error: null,
      });

      const { result } = renderHook(() =>
        useMultipleChoiceTest({
          question: mockQuestion,
          questionNumber: 5,
          totalQuestions: 10,
          onAnswer: vi.fn(),
        })
      );

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSelect("peace");
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe("question changes", () => {
    it("resets state when question changes", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [
          { english_translation: "peace" },
          { english_translation: "war" },
        ],
        error: null,
      });

      const { result, rerender } = renderHook(
        (props) => useMultipleChoiceTest(props),
        {
          initialProps: {
            question: mockQuestion,
            questionNumber: 1,
            totalQuestions: 10,
            onAnswer: vi.fn(),
          },
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.useFakeTimers();

      act(() => {
        result.current.handleSelect("peace");
      });

      expect(result.current.selectedAnswer).toBe("peace");
      expect(result.current.showFeedback).toBe(true);

      vi.useRealTimers();

      const newQuestion: TestQuestion = {
        ...mockQuestion,
        word: {
          ...mockQuestion.word,
          id: "word-2",
          hebrew_word: "אַהֲבָה",
          english_translation: "love",
        },
      };

      rerender({
        question: newQuestion,
        questionNumber: 2,
        totalQuestions: 10,
        onAnswer: vi.fn(),
      });

      await waitFor(() => {
        expect(result.current.selectedAnswer).toBeNull();
        expect(result.current.showFeedback).toBe(false);
      });
    });
  });
});
