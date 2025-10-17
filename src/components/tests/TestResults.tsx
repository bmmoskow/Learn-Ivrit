import { TestQuestion, TestType } from '../TestPanel';
import { Trophy, RotateCcw, Home, TrendingUp } from 'lucide-react';

type TestResultsProps = {
  test: TestQuestion[];
  testType: TestType;
  onRetakeTest: () => void;
  onNewTest: () => void;
};

export function TestResults({ test, testType, onRetakeTest, onNewTest }: TestResultsProps) {
  const correctCount = test.filter(q => q.isCorrect).length;
  const totalQuestions = test.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  const getScoreColor = () => {
    if (scorePercentage >= 90) return 'text-green-600';
    if (scorePercentage >= 70) return 'text-blue-600';
    if (scorePercentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    if (scorePercentage >= 90) return 'Excellent work!';
    if (scorePercentage >= 70) return 'Good job!';
    if (scorePercentage >= 50) return 'Keep practicing!';
    return 'Keep studying!';
  };

  const testTypeLabel = {
    flashcard: 'Flashcards',
    multiple_choice: 'Multiple Choice',
    fill_in_blank: 'Fill in the Blank'
  }[testType];

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-2xl p-12">
          <div className="text-center mb-8">
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${getScoreColor()}`} />
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Test Complete!</h2>
            <p className="text-xl text-gray-600">{getScoreMessage()}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 mb-8">
            <div className="text-center">
              <div className={`text-6xl font-bold mb-2 ${getScoreColor()}`}>
                {scorePercentage}%
              </div>
              <div className="text-gray-700 text-lg">
                {correctCount} out of {totalQuestions} correct
              </div>
              <div className="text-gray-500 text-sm mt-2">
                Test Type: {testTypeLabel}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Question Breakdown
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {test.map((question, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    question.isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold" dir="rtl">
                          {question.word.hebrew_word}
                        </span>
                        <span className={`text-sm font-semibold ${
                          question.isCorrect ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {question.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Correct answer:</span> {question.word.english_translation}
                      </div>
                      {question.userAnswer && question.userAnswer !== question.word.english_translation && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">Your answer:</span> {question.userAnswer}
                        </div>
                      )}
                    </div>
                    {question.responseTime && (
                      <div className="text-sm text-gray-500">
                        {question.responseTime}s
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onRetakeTest}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition text-lg font-semibold shadow-lg"
            >
              <RotateCcw className="w-6 h-6" />
              Retake Test
            </button>
            <button
              onClick={onNewTest}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white py-4 rounded-xl hover:bg-gray-700 transition text-lg font-semibold shadow-lg"
            >
              <Home className="w-6 h-6" />
              New Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
