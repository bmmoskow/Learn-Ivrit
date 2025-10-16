import { useState } from 'react';
import { TestQuestion } from '../TestPanel';
import { RotateCw, Check, X } from 'lucide-react';

type FlashcardTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

export function FlashcardTest({ question, questionNumber, totalQuestions, onAnswer }: FlashcardTestProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleFlip = () => {
    if (!answered) {
      setIsFlipped(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setAnswered(true);
    setTimeout(() => {
      onAnswer(question.word.english_translation, isCorrect);
      setIsFlipped(false);
      setAnswered(false);
    }, 500);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">
            Question {questionNumber} of {totalQuestions}
          </div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div
          className="relative w-full h-96 cursor-pointer perspective-1000"
          onClick={handleFlip}
        >
          <div
            className={`relative w-full h-full transition-transform duration-500 preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-12 flex flex-col items-center justify-center backface-hidden">
              <p className="text-sm font-semibold text-gray-500 uppercase mb-6">
                Hebrew Word
              </p>
              <p className="text-6xl font-bold text-gray-900 mb-8" dir="rtl">
                {question.word.hebrew_word}
              </p>
              {question.word.transliteration && (
                <p className="text-xl text-gray-500 mb-6">
                  {question.word.transliteration}
                </p>
              )}
              <div className="flex items-center gap-2 text-blue-600 mt-auto">
                <RotateCw className="w-5 h-5" />
                <span className="text-sm font-medium">Click to reveal answer</span>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-12 flex flex-col items-center justify-center backface-hidden rotate-y-180">
              <p className="text-sm font-semibold text-blue-200 uppercase mb-6">
                English Translation
              </p>
              <p className="text-5xl font-bold text-white mb-12">
                {question.word.english_translation}
              </p>
              {!answered && (
                <>
                  <p className="text-white text-lg mb-6">Did you get it right?</p>
                  <div className="flex gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(false);
                      }}
                      className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Incorrect
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(true);
                      }}
                      className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Correct
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          {!isFlipped && 'Think about the answer, then click the card to check'}
          {isFlipped && !answered && 'Be honest with yourself!'}
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
