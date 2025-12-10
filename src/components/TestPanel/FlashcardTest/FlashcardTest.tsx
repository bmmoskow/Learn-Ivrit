import { useFlashcardTest } from "./useFlashcardTest";
import { FlashcardTestUI } from "./FlashcardTestUI";
import type { FlashcardTestProps } from "./flashcardTestUtils";

export function FlashcardTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: FlashcardTestProps) {
  const hook = useFlashcardTest({
    question,
    questionNumber,
    totalQuestions,
    onAnswer,
  });

  return (
    <FlashcardTestUI
      question={question}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      showAnswer={hook.showAnswer}
      handleShowAnswer={hook.handleShowAnswer}
      handleCorrect={hook.handleCorrect}
      handleIncorrect={hook.handleIncorrect}
    />
  );
}
