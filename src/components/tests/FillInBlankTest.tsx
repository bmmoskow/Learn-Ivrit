import { useState, FormEvent } from 'react';
import { TestQuestion } from '../TestPanel';
import { Check, X } from 'lucide-react';

type FillInBlankTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

export function FillInBlankTest({ question, questionNumber, totalQuestions, onAnswer }: FillInBlankTestProps) {
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    const userAnswer = answer.trim().toLowerCase();
    const correctAnswer = question.word.english_translation.toLowerCase();
    const correct = userAnswer === correctAnswer;

    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer(answer.trim(), correct);
      setAnswer('');
      setShowFeedback(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="text-sm font-semibold text-orange-600">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-12">
          <div className="text-center mb-8">
            <p className="text-gray-600 text-lg mb-4">Type the English translation:</p>
            <div className="text-5xl font-bold text-gray-900 mb-8" dir="rtl">
              {question.word.hebrew_word}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={showFeedback}
                className="w-full p-4 text-xl border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none disabled:bg-gray-100"
                placeholder="Type your answer..."
                autoFocus
              />
            </div>

            {showFeedback && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                isCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
              }`}>
                {isCorrect ? (
                  <>
                    <Check className="w-6 h-6 text-green-600" />
                    <span className="text-lg font-semibold">Correct!</span>
                  </>
                ) : (
                  <>
                    <X className="w-6 h-6 text-red-600" />
                    <div>
                      <span className="text-lg font-semibold block">Incorrect</span>
                      <span className="text-sm">Correct answer: {question.word.english_translation}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!answer.trim() || showFeedback}
              className="w-full bg-orange-600 text-white py-4 rounded-xl hover:bg-orange-700 transition text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          </form>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < questionNumber - 1
                    ? 'bg-orange-600'
                    : i === questionNumber - 1
                    ? 'bg-orange-400'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
