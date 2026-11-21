import { Eye, EyeOff, ChevronLeft, ChevronRight, X, Loader2, Info } from "lucide-react";
import type { WordWithStats } from "../../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";
import { getProgressBarStatus, getRevealText } from "./flashcardReviewUtils";

interface FlashcardReviewUIProps {
  loading: boolean;
  words: WordWithStats[];
  currentWord: WordWithStats | null;
  currentIndex: number;
  showAnswer: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  onReveal: () => void;
  onHide: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
}

function ExitButton({ onExit }: { onExit: () => void }) {
  return (
    <button
      onClick={onExit}
      className="flex items-center gap-2 px-4 py-2 bg-white/80 text-gray-700 rounded-lg hover:bg-white transition shadow-sm"
    >
      <X className="w-5 h-5" />
      <span className="font-semibold">Done</span>
    </button>
  );
}

// Short, non-nagging reminder: review doesn't score, tests do. This is the whole
// reason flashcards moved out of the test panel, so it's stated plainly.
function PracticeNudge() {
  return (
    <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
      <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <p className="text-sm text-blue-800">
        Flashcards are just for practice — they don't change your scores. To update
        your mastery (and stop seeing the same words here), take a{" "}
        <span className="font-semibold">Multiple Choice</span> or{" "}
        <span className="font-semibold">Fill in the Blank</span> test.
      </p>
    </div>
  );
}

export function FlashcardReviewUI({
  loading,
  words,
  currentWord,
  currentIndex,
  showAnswer,
  hasNext,
  hasPrevious,
  onReveal,
  onHide,
  onNext,
  onPrevious,
  onExit,
}: FlashcardReviewUIProps) {
  return (
    // Full-screen overlay laid out as a column: fixed top bar, a flexible
    // scrolling content area, and — when a card is showing — a pinned controls
    // footer. The root itself does NOT scroll; the card area owns scrolling so
    // the footer can never be pushed off-screen.
    <div className="fixed inset-0 z-50 flex flex-col bg-linear-to-br from-blue-50 to-blue-100">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Flashcard Review</h2>
        <ExitButton onExit={onExit} />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : !currentWord ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-10 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No words to review yet</h3>
            <p className="text-gray-600">
              Add some vocabulary words first, then come back to practice them with
              flashcards.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Scrollable content: card label, the card, and the practice nudge.
              `min-h-0` lets this region shrink below its content so the controls
              footer below is never pushed off-screen; `overflow-y-auto` keeps the
              card itself reachable. The inner block uses `m-auto` so it centers
              vertically when it fits and top-aligns (fully scrollable) when it's
              taller than the region — e.g. at browser zoom or a short screen. */}
          <div className="flex-1 min-h-0 overflow-y-auto flex p-4 sm:p-6">
            <div className="w-full max-w-2xl m-auto">
              <div className="text-center mb-6">
                <span className="text-sm font-semibold text-blue-600">
                  Card {currentIndex + 1} of {words.length}
                </span>
              </div>

              <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 min-h-[320px] sm:min-h-[400px] flex flex-col items-center justify-center">
                <div className="text-5xl sm:text-6xl font-bold text-gray-900" dir="rtl">
                  {currentWord.hebrew_word}
                </div>

                {showAnswer ? (
                  <div className="text-center mt-8">
                    <div className="text-2xl sm:text-3xl text-blue-600 font-semibold">
                      {getRevealText(currentWord)}
                    </div>
                    {currentWord.transliteration && (
                      <div className="text-base text-gray-500 mt-2">
                        {currentWord.transliteration}
                      </div>
                    )}
                    {currentWord.definition &&
                      currentWord.definition !== currentWord.english_translation && (
                        <div className="text-base text-gray-600 mt-3">
                          {currentWord.definition}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="mt-8 text-sm text-gray-400">Tap &ldquo;Show Translation&rdquo; to reveal</div>
                )}
              </div>

              <PracticeNudge />
            </div>
          </div>

          {/* Controls + progress pinned in a non-scrolling footer so they stay on
              screen at any zoom or viewport height. This is the fix for the bug
              where, under zoom, the card alone exceeded the viewport and pushed
              the controls below the fold. */}
          <div className="shrink-0 border-t border-blue-200/60 bg-blue-50/90 backdrop-blur px-4 py-3 sm:px-6 sm:py-4">
            <div className="w-full max-w-2xl mx-auto">
              {/* Controls grouped on one row — Previous / Show-Hide / Next — so
                  there's minimal pointer travel between revealing and advancing.
                  The reveal toggle is the primary (blue) action; stepping is
                  neutral. Wraps gracefully if the row is too narrow. */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
                {showAnswer ? (
                  <button
                    onClick={onHide}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition font-semibold"
                  >
                    <EyeOff className="w-5 h-5" />
                    Hide Translation
                  </button>
                ) : (
                  <button
                    onClick={onReveal}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition font-semibold"
                  >
                    <Eye className="w-5 h-5" />
                    Show Translation
                  </button>
                )}
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Progress dots */}
              <div className="mt-3 flex justify-center">
                <div className="flex flex-wrap gap-2 justify-center">
                  {words.map((_, i) => {
                    const status = getProgressBarStatus(i, currentIndex);
                    return (
                      <div
                        key={i}
                        className={`h-2 w-6 rounded-full ${
                          status === "completed"
                            ? "bg-blue-600"
                            : status === "current"
                            ? "bg-blue-400"
                            : "bg-gray-300"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
