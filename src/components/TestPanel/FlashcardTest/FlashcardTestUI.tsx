import { Eye, Check, X } from "lucide-react";
import type { TestQuestion } from "../testPanelUtils";
import { getProgressBarStatus } from "./flashcardTestUtils";

interface FlashcardTestUIProps {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  showAnswer: boolean;
  handleShowAnswer: () => void;
  handleCorrect: () => void;
  handleIncorrect: () => void;
}

export function FlashcardTestUI({
  question,
  questionNumber,
  totalQuestions,
  showAnswer,
  handleShowAnswer,
  handleCorrect,
  handleIncorrect,
}: FlashcardTestUIProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="text-sm font-semibold text-blue-600">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-12 min-h-[400px] flex flex-col items-center justify-center">
          <div className="text-6xl font-bold text-gray-900 mb-8" dir="rtl">
            {question.word.hebrew_word}
          </div>

          {showAnswer ? (
            <>
              <div className="text-3xl text-blue-600 font-semibold mb-12">
                {question.word.english_translation}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCorrect}
                  className="flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition text-lg font-semibold shadow-lg"
                >
                  <Check className="w-6 h-6" />
                  I Got It Right
                </button>
                <button
                  onClick={handleIncorrect}
                  className="flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-xl hover:bg-red-700 transition text-lg font-semibold shadow-lg"
                >
                  <X className="w-6 h-6" />
                  I Got It Wrong
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleShowAnswer}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition text-lg font-semibold shadow-lg"
            >
              <Eye className="w-6 h-6" />
              Show Answer
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const status = getProgressBarStatus(i, questionNumber);
              return (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full ${
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
  );
}
