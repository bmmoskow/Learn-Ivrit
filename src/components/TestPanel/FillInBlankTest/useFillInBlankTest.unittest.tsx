import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFillInBlankTest } from "./useFillInBlankTest";
import type { TestQuestion } from "../testPanelUtils";

describe("useFillInBlankTest", () => {
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
    it("initializes with empty user input", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));
      expect(result.current.userInput).toBe("");
    });

    it("initializes with showFeedback as false", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));
      expect(result.current.showFeedback).toBe(false);
    });

    it("initializes with isCorrect as false", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));
      expect(result.current.isCorrect).toBe(false);
    });

    it("initializes with isProcessing as false", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));
      expect(result.current.isProcessing).toBe(false);
    });

    it("has inputRef defined", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));
      expect(result.current.inputRef).toBeDefined();
    });
  });

  describe("setUserInput", () => {
    it("updates userInput state", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("test");
      });

      expect(result.current.userInput).toBe("test");
    });
  });

  describe("handleSubmit", () => {
    it("does not submit when input is empty", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.showFeedback).toBe(false);
      expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it("does not submit when input is only whitespace", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("   ");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.showFeedback).toBe(false);
      expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it("shows feedback on valid submission", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("hello");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.showFeedback).toBe(true);
    });

    it("sets isCorrect to true for correct answer", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("hello");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.isCorrect).toBe(true);
    });

    it("sets isCorrect to false for incorrect answer", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("wrong");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.isCorrect).toBe(false);
    });

    it("calls onAnswer after delay", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("hello");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(mockOnAnswer).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockOnAnswer).toHaveBeenCalledWith("hello", true);
    });

    it("does not allow re-submission after feedback shown", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("hello");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      act(() => {
        result.current.setUserInput("world");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should only be called once
      expect(mockOnAnswer).toHaveBeenCalledTimes(1);
      expect(mockOnAnswer).toHaveBeenCalledWith("hello", true);
    });

    it("sets isProcessing on last question", () => {
      const { result } = renderHook(() =>
        useFillInBlankTest({
          ...defaultProps,
          questionNumber: 5,
          totalQuestions: 5,
        })
      );

      act(() => {
        result.current.setUserInput("hello");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.isProcessing).toBe(true);
    });

    it("does not set isProcessing on non-last question", () => {
      const { result } = renderHook(() => useFillInBlankTest(defaultProps));

      act(() => {
        result.current.setUserInput("hello");
      });

      act(() => {
        result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe("question change", () => {
    it("resets state when question changes", () => {
      const { result, rerender } = renderHook(
        (props) => useFillInBlankTest(props),
        { initialProps: defaultProps }
      );

      act(() => {
        result.current.setUserInput("hello");
      });

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

      expect(result.current.userInput).toBe("");
      expect(result.current.showFeedback).toBe(false);
    });
  });
});
