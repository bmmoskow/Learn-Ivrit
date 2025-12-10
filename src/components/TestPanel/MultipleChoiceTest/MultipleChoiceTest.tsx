import { useMultipleChoiceTest } from "./useMultipleChoiceTest";
import { MultipleChoiceTestUI } from "./MultipleChoiceTestUI";
import type { MultipleChoiceTestProps } from "./multipleChoiceTestUtils";

export function MultipleChoiceTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: MultipleChoiceTestProps) {
  const hook = useMultipleChoiceTest({
    question,
    questionNumber,
    totalQuestions,
    onAnswer,
  });

  return (
    <MultipleChoiceTestUI
      question={question}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      options={hook.options}
      selectedAnswer={hook.selectedAnswer}
      showFeedback={hook.showFeedback}
      loading={hook.loading}
      handleSelect={hook.handleSelect}
    />
  );
}
