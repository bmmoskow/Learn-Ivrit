import { lazy, Suspense } from "react";
import { TestResults } from "./TestResults/TestResults";
import { BookOpen, Loader2 } from "lucide-react";
import type { TestType, TestQuestion } from "./testPanelUtils";

const FlashcardTest = lazy(() =>
  import("./FlashcardTest").then((m) => ({ default: m.FlashcardTest }))
);
const MultipleChoiceTest = lazy(() =>
  import("./MultipleChoiceTest").then((m) => ({
    default: m.MultipleChoiceTest,
  }))
);
const FillInBlankTest = lazy(() =>
  import("./FillInBlankTest/FillInBlankTest").then((m) => ({
    default: m.FillInBlankTest,
  }))
);

interface TestPanelUIProps {
  loading: boolean;
  wordsCount: number;
  testType: TestType | null;
  questionCount: number;
  minQuestionCount: number;
  maxQuestionCount: number;
  currentTest: TestQuestion[];
  currentQuestionIndex: number;
  currentQuestion: TestQuestion | null;
  showResults: boolean;
  onQuestionCountChange: (count: number) => void;
  onStartTest: (type: TestType) => void;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  onResetTest: () => void;
}

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function EmptyVocabulary() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          No Vocabulary Words Yet
        </h2>
        <p className="text-muted-foreground">
          Add some words to your vocabulary list before taking a test. Start by
          translating Hebrew text!
        </p>
      </div>
    </div>
  );
}

interface TestSelectionProps {
  wordsCount: number;
  questionCount: number;
  minQuestionCount: number;
  maxQuestionCount: number;
  onQuestionCountChange: (count: number) => void;
  onStartTest: (type: TestType) => void;
}

function TestSelection({
  wordsCount,
  questionCount,
  minQuestionCount,
  maxQuestionCount,
  onQuestionCountChange,
  onStartTest,
}: TestSelectionProps) {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Test Your Knowledge
          </h2>
          <p className="text-muted-foreground mb-8">
            Choose a test format and challenge yourself with {wordsCount} words
            in your vocabulary
          </p>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Number of Questions
            </label>
            <input
              type="range"
              min={minQuestionCount}
              max={maxQuestionCount}
              value={questionCount}
              onChange={(e) => onQuestionCountChange(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>{minQuestionCount}</span>
              <span className="font-semibold text-primary">
                {questionCount} questions
              </span>
              <span>{maxQuestionCount}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => onStartTest("flashcard")}
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">🎴</div>
              <h3 className="text-xl font-bold mb-2">Flashcards</h3>
              <p className="text-blue-100 text-sm">
                See Hebrew words and guess the English translation
              </p>
            </button>

            <button
              onClick={() => onStartTest("multiple_choice")}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-xl font-bold mb-2">Multiple Choice</h3>
              <p className="text-green-100 text-sm">
                Choose the correct translation from options
              </p>
            </button>

            <button
              onClick={() => onStartTest("fill_in_blank")}
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">✍️</div>
              <h3 className="text-xl font-bold mb-2">Fill in the Blank</h3>
              <p className="text-orange-100 text-sm">
                Type the English translation yourself
              </p>
            </button>
          </div>

          <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary">
              <strong>Adaptive Learning:</strong> The test will focus more on
              words you struggle with and less on words you've mastered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActiveTestProps {
  testType: TestType;
  currentQuestion: TestQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
}

function ActiveTest({
  testType,
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  onAnswer,
}: ActiveTestProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {testType === "flashcard" && (
        <FlashcardTest
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          onAnswer={onAnswer}
        />
      )}

      {testType === "multiple_choice" && (
        <MultipleChoiceTest
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          onAnswer={onAnswer}
        />
      )}

      {testType === "fill_in_blank" && (
        <FillInBlankTest
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          onAnswer={onAnswer}
        />
      )}
    </Suspense>
  );
}

export function TestPanelUI({
  loading,
  wordsCount,
  testType,
  questionCount,
  minQuestionCount,
  maxQuestionCount,
  currentTest,
  currentQuestionIndex,
  currentQuestion,
  showResults,
  onQuestionCountChange,
  onStartTest,
  onAnswer,
  onResetTest,
}: TestPanelUIProps) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (wordsCount === 0) {
    return <EmptyVocabulary />;
  }

  if (showResults) {
    return (
      <TestResults
        test={currentTest}
        testType={testType!}
        onRetakeTest={() => onStartTest(testType!)}
        onNewTest={onResetTest}
      />
    );
  }

  if (testType && currentTest.length > 0 && currentQuestion) {
    return (
      <ActiveTest
        testType={testType}
        currentQuestion={currentQuestion}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={currentTest.length}
        onAnswer={onAnswer}
      />
    );
  }

  return (
    <TestSelection
      wordsCount={wordsCount}
      questionCount={questionCount}
      minQuestionCount={minQuestionCount}
      maxQuestionCount={maxQuestionCount}
      onQuestionCountChange={onQuestionCountChange}
      onStartTest={onStartTest}
    />
  );
}
