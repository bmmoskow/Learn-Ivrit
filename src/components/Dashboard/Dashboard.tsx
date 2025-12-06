import { BookOpen, Target, TrendingUp, Award, Clock, Flame } from "lucide-react";
import { useDashboard, formatTestType, formatDate } from "./useDashboard";

export function Dashboard() {
  const { stats, loading } = useDashboard();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Track your Hebrew learning progress</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8" />
              <span className="text-3xl font-bold">{stats.totalWords}</span>
            </div>
            <p className="text-blue-100 font-medium">Words Learned</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8" />
              <span className="text-3xl font-bold">{stats.testsCompleted}</span>
            </div>
            <p className="text-green-100 font-medium">Tests Completed</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
              <span className="text-3xl font-bold">{stats.averageScore}%</span>
            </div>
            <p className="text-purple-100 font-medium">Average Score</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Flame className="w-8 h-8" />
              <span className="text-3xl font-bold">{stats.studyStreak}</span>
            </div>
            <p className="text-orange-100 font-medium">Day Streak</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-red-600" />
              Words to Practice
            </h2>

            {stats.weakWords.length > 0 ? (
              <div className="space-y-3">
                {stats.weakWords.map((word) => (
                  <div key={word.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-gray-900" dir="rtl">
                        {word.hebrew_word}
                      </span>
                      <span className="text-sm font-semibold text-red-700">
                        {Math.round(word.statistics.confidence_score)}% mastery
                      </span>
                    </div>
                    <p className="text-gray-700">{word.english_translation}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                      <span>
                        {word.statistics.correct_count}/{word.statistics.total_attempts} correct
                      </span>
                      <span>Streak: {word.statistics.consecutive_correct}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No test data yet. Take a test to see which words need practice!
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Recent Tests
            </h2>

            {stats.recentTests.length > 0 ? (
              <div className="space-y-3">
                {stats.recentTests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{formatTestType(test.test_type)}</span>
                      <span
                        className={`text-lg font-bold ${
                          test.score_percentage >= 80
                            ? "text-green-600"
                            : test.score_percentage >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {Math.round(test.score_percentage)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        {test.correct_answers}/{test.total_questions} correct
                      </span>
                      {test.duration_seconds && (
                        <span>
                          {Math.floor(test.duration_seconds / 60)}m {test.duration_seconds % 60}s
                        </span>
                      )}
                      <span className="ml-auto">{formatDate(test.completed_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No tests completed yet. Start testing your knowledge!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
