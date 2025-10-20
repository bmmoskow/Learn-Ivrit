import { useState, useEffect, useRef } from 'react';
import { TestQuestion } from '../TestPanel';
import { Check, X, ArrowRight } from 'lucide-react';

type FillInBlankTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

export function FillInBlankTest({ question, questionNumber, totalQuestions, onAnswer }: FillInBlankTestProps) {
  const [userInput, setUserInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userInput.trim() || showFeedback) return;

    const correct = userInput.trim().toLowerCase() === question.word.english_translation.toLowerCase();
    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer(userInput.trim(), correct);
      setUserInput('');
      setShowFeedback(false);
    }, 2000);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-white">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">
            Question {questionNumber} of {totalQuestions}
          </div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-600 transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <p className="text-sm font-semibold text-gray-500 uppercase mb-4 text-center">
            Type the English translation
          </p>

          <div className="text-center mb-8">
            <p className="text-6xl font-bold text-gray-900 mb-4" dir="rtl">
              {question.word.hebrew_word}
            </p>
            {question.word.transliteration && (
              <p className="text-xl text-gray-500">
                {question.word.transliteration}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={showFeedback}
                placeholder="Type your answer..."
                className="w-full px-6 py-4 text-2xl text-center border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              />
            </div>

            {!showFeedback && (
              <button
                type="submit"
                disabled={!userInput.trim()}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Submit Answer
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </form>

          {showFeedback && (
            <div className={`mt-6 p-6 rounded-xl ${
              isCorrect
                ? 'bg-green-100 border-2 border-green-300'
                : 'bg-red-100 border-2 border-red-300'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                {isCorrect ? (
                  <>
                    <Check className="w-6 h-6 text-green-600" />
                    <p className="text-xl font-bold text-green-800">Correct!</p>
                  </>
                ) : (
                  <>
                    <X className="w-6 h-6 text-red-600" />
                    <p className="text-xl font-bold text-red-800">Incorrect</p>
                  </>
                )}
              </div>
              {!isCorrect && (
                <div className="mt-4">
                  <p className="text-sm text-red-700 mb-1">Correct answer:</p>
                  <p className="text-2xl font-bold text-red-900">
                    {question.word.english_translation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          {!showFeedback && 'Type your answer and press Enter or click Submit'}
        </div>
      </div>
    </div>
  );
}
