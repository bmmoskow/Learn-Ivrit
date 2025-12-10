import { useState } from "react";
import { TestQuestion } from "../TestPanel/testPanelUtils";
import { Eye, EyeOff, Check, X } from "lucide-react";

type FlashcardTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

export function FlashcardTest({ question, questionNumber, totalQuestions, onAnswer }: FlashcardTestProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleCorrect = () => {
    onAnswer(question.word.english_translation, true);
    setShowAnswer(false);
  };

  const handleIncorrect = () => {
    onAnswer("", false);
    setShowAnswer(false);
  };

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
              <div className="text-3xl text-blue-600 font-semibold mb-12">{question.word.english_translation}</div>

              <div className="flex gap-4">
                <button
                  onClick={handleCorrect}
                  className="flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition text-lg font-semibold shadow-lg"
                >
                  <Check className="w-6 h-6" />I Got It Right
                </button>
                <button
                  onClick={handleIncorrect}
                  className="flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-xl hover:bg-red-700 transition text-lg font-semibold shadow-lg"
                >
                  <X className="w-6 h-6" />I Got It Wrong
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAnswer(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition text-lg font-semibold shadow-lg"
            >
              <Eye className="w-6 h-6" />
              Show Answer
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < questionNumber - 1 ? "bg-blue-600" : i === questionNumber - 1 ? "bg-blue-400" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
