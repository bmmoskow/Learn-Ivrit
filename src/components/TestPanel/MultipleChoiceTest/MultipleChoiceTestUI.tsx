import { Check, X, Loader2 } from "lucide-react";
import type { TestQuestion } from "../testPanelUtils";
import { getOptionButtonClasses } from "./multipleChoiceTestUtils";

interface MultipleChoiceTestUIProps {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  options: string[];
  selectedAnswer: string | null;
  showFeedback: boolean;
  loading: boolean;
  handleSelect: (answer: string) => void;
}

export function MultipleChoiceTestUI({
  question,
  questionNumber,
  totalQuestions,
  options,
  selectedAnswer,
  showFeedback,
  loading,
  handleSelect,
}: MultipleChoiceTestUIProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  const correctAnswer = question.word.english_translation;

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="text-sm font-semibold text-green-600">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-12">
          <div className="text-center mb-8">
            <p className="text-gray-600 text-lg mb-4">Choose the correct translation:</p>
            <div className="text-5xl font-bold text-gray-900" dir="rtl">
              {question.word.hebrew_word}
            </div>
          </div>

          <div className="space-y-4">
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === correctAnswer;
              const buttonClass = getOptionButtonClasses(isSelected, isCorrect, showFeedback);

              return (
                <button
                  key={index}
                  onClick={() => handleSelect(option)}
                  disabled={showFeedback}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showFeedback && isCorrect && <Check className="w-6 h-6 text-green-600" />}
                    {showFeedback && isSelected && !isCorrect && (
                      <X className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < questionNumber - 1
                    ? "bg-green-600"
                    : i === questionNumber - 1
                      ? "bg-green-400"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
