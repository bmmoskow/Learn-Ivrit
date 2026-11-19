import { useFlashcardReview } from "./useFlashcardReview";
import { FlashcardReviewUI } from "./FlashcardReviewUI";
import type { FlashcardReviewProps } from "./flashcardReviewUtils";

export function FlashcardReview({ onExit }: FlashcardReviewProps) {
  const hook = useFlashcardReview();

  return (
    <FlashcardReviewUI
      loading={hook.loading}
      words={hook.words}
      currentWord={hook.currentWord}
      currentIndex={hook.currentIndex}
      showAnswer={hook.showAnswer}
      hasNext={hook.hasNext}
      hasPrevious={hook.hasPrevious}
      onReveal={hook.revealAnswer}
      onHide={hook.hideAnswer}
      onNext={hook.goToNext}
      onPrevious={hook.goToPrevious}
      onExit={onExit}
    />
  );
}
