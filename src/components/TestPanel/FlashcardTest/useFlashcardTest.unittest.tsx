import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlashcardTest } from "./useFlashcardTest";
import type { TestQuestion } from "../testPanelUtils";

describe("useFlashcardTest", () => {
  const mockOnAnswer = vi.fn();

  const mockQuestion: TestQuestion = {
    word: {
      id: "word-1",
      hebrew_word: "שלום",
      english_translation: "hello",
      definition: "A greeting",
      transliteration: "shalom",
      user_id: "user-1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      statistics: {
        id: "stats-1",
        user_id: "user-1",
        word_id: "word-1",
        correct_count: 0,
        incorrect_count: 0,
        total_attempts: 0,
        consecutive_correct: 0,
        last_tested: null,
        confidence_score: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    },
  };

  const defaultProps = {
    question: mockQuestion,
    questionNumber: 1,
    totalQuestions: 5,
    onAnswer: mockOnAnswer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("initializes with showAnswer as false", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));
      expect(result.current.showAnswer).toBe(false);
    });

    it("initializes with isProcessing as false", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));
      expect(result.current.isProcessing).toBe(false);
    });

    it("has handleShowAnswer function defined", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));
      expect(result.current.handleShowAnswer).toBeDefined();
      expect(typeof result.current.handleShowAnswer).toBe("function");
    });

    it("has handleCorrect function defined", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));
      expect(result.current.handleCorrect).toBeDefined();
      expect(typeof result.current.handleCorrect).toBe("function");
    });

    it("has handleIncorrect function defined", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));
      expect(result.current.handleIncorrect).toBeDefined();
      expect(typeof result.current.handleIncorrect).toBe("function");
    });
  });

  describe("handleShowAnswer", () => {
    it("sets showAnswer to true", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));

      act(() => {
        result.current.handleShowAnswer();
      });

      expect(result.current.showAnswer).toBe(true);
    });

    it("can be called multiple times idempotently", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));

      act(() => {
        result.current.handleShowAnswer();
        result.current.handleShowAnswer();
      });

      expect(result.current.showAnswer).toBe(true);
    });
  });

  describe("handleCorrect", () => {
    it("calls onAnswer with correct answer after delay", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));

      act(() => {
        result.current.handleCorrect();
      });

      expect(mockOnAnswer).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnAnswer).toHaveBeenCalledWith("hello", true);
    });

    it("sets isProcessing on last question", () => {
      const { result } = renderHook(() =>
        useFlashcardTest({
          ...defaultProps,
          questionNumber: 5,
          totalQuestions: 5,
        })
      );

      act(() => {
        result.current.handleCorrect();
      });

      expect(result.current.isProcessing).toBe(true);
    });

    it("does not set isProcessing on non-last question", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));

      act(() => {
        result.current.handleCorrect();
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe("handleIncorrect", () => {
    it("calls onAnswer with empty string after delay", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));

      act(() => {
        result.current.handleIncorrect();
      });

      expect(mockOnAnswer).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnAnswer).toHaveBeenCalledWith("", false);
    });

    it("sets isProcessing on last question", () => {
      const { result } = renderHook(() =>
        useFlashcardTest({
          ...defaultProps,
          questionNumber: 5,
          totalQuestions: 5,
        })
      );

      act(() => {
        result.current.handleIncorrect();
      });

      expect(result.current.isProcessing).toBe(true);
    });

    it("does not set isProcessing on non-last question", () => {
      const { result } = renderHook(() => useFlashcardTest(defaultProps));

      act(() => {
        result.current.handleIncorrect();
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe("question change", () => {
    it("resets showAnswer when question changes", () => {
      const { result, rerender } = renderHook(
        (props) => useFlashcardTest(props),
        { initialProps: defaultProps }
      );

      act(() => {
        result.current.handleShowAnswer();
      });

      expect(result.current.showAnswer).toBe(true);

      const newQuestion: TestQuestion = {
        word: {
          id: "word-2",
          hebrew_word: "תודה",
          english_translation: "thanks",
          definition: "Expression of gratitude",
          transliteration: "toda",
          user_id: "user-1",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          statistics: {
            id: "stats-2",
            user_id: "user-1",
            word_id: "word-2",
            correct_count: 0,
            incorrect_count: 0,
            total_attempts: 0,
            consecutive_correct: 0,
            last_tested: null,
            confidence_score: 0,
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
          },
        },
      };

      rerender({ ...defaultProps, question: newQuestion, questionNumber: 2 });

      expect(result.current.showAnswer).toBe(false);
    });

    it("does not reset showAnswer when processing", () => {
      const { result, rerender } = renderHook(
        (props) => useFlashcardTest(props),
        {
          initialProps: {
            ...defaultProps,
            questionNumber: 5,
            totalQuestions: 5,
          }
        }
      );

      act(() => {
        result.current.handleShowAnswer();
      });

      act(() => {
        result.current.handleCorrect();
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.showAnswer).toBe(true);

      const newQuestion: TestQuestion = {
        word: {
          id: "word-2",
          hebrew_word: "תודה",
          english_translation: "thanks",
          definition: "Expression of gratitude",
          transliteration: "toda",
          user_id: "user-1",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          statistics: {
            id: "stats-2",
            user_id: "user-1",
            word_id: "word-2",
            correct_count: 0,
            incorrect_count: 0,
            total_attempts: 0,
            consecutive_correct: 0,
            last_tested: null,
            confidence_score: 0,
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
          },
        },
      };

      rerender({ ...defaultProps, question: newQuestion, questionNumber: 2 });

      expect(result.current.showAnswer).toBe(true);
    });
  });
});
