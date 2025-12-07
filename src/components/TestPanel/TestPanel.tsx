import { useTestPanel } from "./useTestPanel";
import { TestPanelUI } from "./TestPanelUI";

export function TestPanel() {
  const {
    words,
    loading,
    testType,
    questionCount,
    currentTest,
    currentQuestionIndex,
    currentQuestion,
    showResults,
    maxQuestionCount,
    minQuestionCount,
    setQuestionCount,
    startTest,
    handleAnswer,
    resetTest,
  } = useTestPanel();

  return (
    <TestPanelUI
      loading={loading}
      wordsCount={words.length}
      testType={testType}
      questionCount={questionCount}
      minQuestionCount={minQuestionCount}
      maxQuestionCount={maxQuestionCount}
      currentTest={currentTest}
      currentQuestionIndex={currentQuestionIndex}
      currentQuestion={currentQuestion}
      showResults={showResults}
      onQuestionCountChange={setQuestionCount}
      onStartTest={startTest}
      onAnswer={handleAnswer}
      onResetTest={resetTest}
    />
  );
}
