import { useFillInBlankTest } from "./useFillInBlankTest";
import { FillInBlankTestUI } from "./FillInBlankTestUI";
import type { FillInBlankTestProps } from "./fillInBlankTestUtils";

export function FillInBlankTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: FillInBlankTestProps) {
  const hook = useFillInBlankTest({
    question,
    questionNumber,
    totalQuestions,
    onAnswer,
  });

  return (
    <FillInBlankTestUI
      question={question}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      userInput={hook.userInput}
      showFeedback={hook.showFeedback}
      isCorrect={hook.isCorrect}
      inputRef={hook.inputRef}
      setUserInput={hook.setUserInput}
      handleSubmit={hook.handleSubmit}
    />
  );
}
