import { TestQuestion, TestType } from '../TestPanel';
import { Check, X, Trophy, RotateCw, Home } from 'lucide-react';

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
    if (scorePercentage >= 80) return 'text-green-600';
    if (scorePercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    if (scorePercentage >= 90) return 'Outstanding!';
    if (scorePercentage >= 80) return 'Great job!';
    if (scorePercentage >= 70) return 'Good work!';
    if (scorePercentage >= 60) return 'Not bad!';
    return 'Keep practicing!';
  };

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-blue-50 to-white overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center mb-8">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Test Complete!</h2>
            <p className="text-xl text-gray-600">{getScoreMessage()}</p>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white text-center mb-8">
            <p className="text-lg mb-2">Your Score</p>
            <p className={`text-6xl font-bold ${getScoreColor()} text-white`}>
              {scorePercentage}%
            </p>
            <p className="text-blue-100 mt-2">
              {correctCount} out of {totalQuestions} correct
            </p>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={onRetakeTest}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              Retake Test
            </button>
            <button
              onClick={onNewTest}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              New Test
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Review Your Answers</h3>

          <div className="space-y-4">
            {test.map((question, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  question.isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {question.isCorrect ? (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <p className="text-2xl font-bold text-gray-900" dir="rtl">
                        {question.word.hebrew_word}
                      </p>
                      <span className="text-gray-400">→</span>
                      <p className="text-xl font-semibold text-gray-700">
                        {question.word.english_translation}
                      </p>
                    </div>

                    {!question.isCorrect && question.userAnswer && (
                      <div className="mt-2">
                        <p className="text-sm text-red-600">
                          Your answer: <span className="font-semibold">{question.userAnswer}</span>
                        </p>
                      </div>
                    )}

                    {question.responseTime && (
                      <p className="text-xs text-gray-500 mt-2">
                        Response time: {question.responseTime}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
