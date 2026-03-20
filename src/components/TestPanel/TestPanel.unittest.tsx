import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { TestPanel } from "./TestPanel";
import type { TestQuestion } from "./testPanelUtils";
import type { WordWithStats } from "../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";

vi.mock("./useTestPanel", () => ({
  useTestPanel: vi.fn(),
}));

vi.mock("./TestPanelUI", () => ({
  TestPanelUI: vi.fn(() => <div data-testid="test-panel-ui">Test Panel UI</div>),
}));

const mockWord: WordWithStats = {
  id: "1",
  user_id: "user-1",
  hebrew_word: "שלום",
  english_translation: "peace",
  definition: "peace",
  transliteration: null,
  created_at: null,
  updated_at: null,
};

const mockQuestion: TestQuestion = {
  word: mockWord,
};

const mockTest: TestQuestion[] = [mockQuestion];

describe("TestPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render TestPanelUI with hook values", async () => {
    const { useTestPanel } = await import("./useTestPanel");

    vi.mocked(useTestPanel).mockReturnValue({
      words: [],
      loading: false,
      testType: "multiple_choice",
      questionCount: 10,
      currentTest: [],
      currentQuestionIndex: 0,
      currentQuestion: null,
      showResults: false,
      maxQuestionCount: 20,
      minQuestionCount: 5,
      testId: null,
      setQuestionCount: vi.fn(),
      startTest: vi.fn(),
      handleAnswer: vi.fn(),
      resetTest: vi.fn(),
    });

    const { getByTestId } = render(<TestPanel />);
    expect(getByTestId("test-panel-ui")).toBeInTheDocument();
  });

  it("should pass all props to TestPanelUI", async () => {
    const { useTestPanel } = await import("./useTestPanel");
    const { TestPanelUI } = await import("./TestPanelUI");

    const mockHook = {
      words: [mockWord],
      loading: true,
      testType: "flashcard" as const,
      questionCount: 15,
      currentTest: mockTest,
      currentQuestionIndex: 0,
      currentQuestion: mockQuestion,
      showResults: true,
      maxQuestionCount: 25,
      minQuestionCount: 10,
      testId: "test-123",
      setQuestionCount: vi.fn(),
      startTest: vi.fn(),
      handleAnswer: vi.fn(),
      resetTest: vi.fn(),
    };

    vi.mocked(useTestPanel).mockReturnValue(mockHook);

    render(<TestPanel />);

    expect(TestPanelUI).toHaveBeenCalledWith(
      expect.objectContaining({
        loading: true,
        wordsCount: 1,
        testType: "flashcard",
        questionCount: 15,
        minQuestionCount: 10,
        maxQuestionCount: 25,
        currentTest: mockTest,
        currentQuestionIndex: 0,
        currentQuestion: mockQuestion,
        showResults: true,
      }),
      {}
    );
  });

  it("should pass event handlers to TestPanelUI", async () => {
    const mockHandlers = {
      words: [],
      loading: false,
      testType: "multiple_choice" as const,
      questionCount: 10,
      currentTest: [],
      currentQuestionIndex: 0,
      currentQuestion: null,
      showResults: false,
      maxQuestionCount: 20,
      minQuestionCount: 5,
      testId: null,
      setQuestionCount: vi.fn(),
      startTest: vi.fn(),
      handleAnswer: vi.fn(),
      resetTest: vi.fn(),
    };

    const { useTestPanel } = await import("./useTestPanel");
    const { TestPanelUI } = await import("./TestPanelUI");
    vi.mocked(useTestPanel).mockReturnValue(mockHandlers);

    render(<TestPanel />);

    expect(TestPanelUI).toHaveBeenCalledWith(
      expect.objectContaining({
        onQuestionCountChange: mockHandlers.setQuestionCount,
        onStartTest: mockHandlers.startTest,
        onAnswer: mockHandlers.handleAnswer,
        onResetTest: mockHandlers.resetTest,
      }),
      {}
    );
  });

  it("should calculate words count correctly", async () => {
    const { useTestPanel } = await import("./useTestPanel");
    const { TestPanelUI } = await import("./TestPanelUI");

    vi.mocked(useTestPanel).mockReturnValue({
      words: [
        { ...mockWord, id: "1", hebrew_word: "שלום", english_translation: "peace" },
        { ...mockWord, id: "2", hebrew_word: "תודה", english_translation: "thank you" },
        { ...mockWord, id: "3", hebrew_word: "כן", english_translation: "yes" },
      ],
      loading: false,
      testType: "multiple_choice",
      questionCount: 10,
      currentTest: [],
      currentQuestionIndex: 0,
      currentQuestion: null,
      showResults: false,
      maxQuestionCount: 20,
      minQuestionCount: 5,
      testId: null,
      setQuestionCount: vi.fn(),
      startTest: vi.fn(),
      handleAnswer: vi.fn(),
      resetTest: vi.fn(),
    });

    render(<TestPanel />);

    expect(TestPanelUI).toHaveBeenCalledWith(
      expect.objectContaining({
        wordsCount: 3,
      }),
      {}
    );
  });
});
