import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, VocabularyWord, WordStatistics, UserTest } from '../lib/supabase';
import { BookOpen, Target, TrendingUp, Award, Clock, Flame } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWords: 0,
    testsCompleted: 0,
    averageScore: 0,
    weakWords: [] as Array<VocabularyWord & { statistics: WordStatistics }>,
    recentTests: [] as UserTest[],
    studyStreak: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: wordsData } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('user_id', user.id);

      // Fetch weak words with JOIN to avoid N+1 queries
      const { data: weakWordsData } = await supabase
        .from('word_statistics')
        .select(`
          *,
          vocabulary_words (*)
        `)
        .eq('user_id', user.id)
        .order('confidence_score', { ascending: true })
        .limit(5);

      const { data: testsData } = await supabase
        .from('user_tests')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5);

      // Transform the joined data to match expected structure
      const weakWords = weakWordsData
        ? weakWordsData
            .filter(item => item.vocabulary_words)
            .map(item => ({
              ...(Array.isArray(item.vocabulary_words)
                ? item.vocabulary_words[0]
                : item.vocabulary_words),
              statistics: {
                id: item.id,
                user_id: item.user_id,
                word_id: item.word_id,
                correct_count: item.correct_count,
                incorrect_count: item.incorrect_count,
                total_attempts: item.total_attempts,
                consecutive_correct: item.consecutive_correct,
                last_tested: item.last_tested,
                confidence_score: item.confidence_score,
                created_at: item.created_at,
                updated_at: item.updated_at,
              }
            })) as Array<VocabularyWord & { statistics: WordStatistics }>
        : [];

      const averageScore = testsData && testsData.length > 0
        ? testsData.reduce((sum, test) => sum + test.score_percentage, 0) / testsData.length
        : 0;

      const studyStreak = calculateStudyStreak(testsData || []);

      setStats({
        totalWords: wordsData?.length || 0,
        testsCompleted: testsData?.length || 0,
        averageScore: Math.round(averageScore),
        weakWords,
        recentTests: testsData || [],
        studyStreak
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStudyStreak = (tests: UserTest[]): number => {
    if (tests.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const testDates = tests
      .map(test => {
        const date = new Date(test.completed_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    let currentDate = today.getTime();

    for (const testDate of testDates) {
      if (testDate === currentDate) {
        streak++;
        currentDate -= 24 * 60 * 60 * 1000;
      } else if (testDate < currentDate) {
        break;
      }
    }

    return streak;
  };

  const formatTestType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
                  <div
                    key={word.id}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
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
                      <span>{word.statistics.correct_count}/{word.statistics.total_attempts} correct</span>
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
                      <span className="font-semibold text-gray-900">
                        {formatTestType(test.test_type)}
                      </span>
                      <span className={`text-lg font-bold ${
                        test.score_percentage >= 80
                          ? 'text-green-600'
                          : test.score_percentage >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {Math.round(test.score_percentage)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{test.correct_answers}/{test.total_questions} correct</span>
                      {test.duration_seconds && (
                        <span>{Math.floor(test.duration_seconds / 60)}m {test.duration_seconds % 60}s</span>
                      )}
                      <span className="ml-auto">{formatDate(test.completed_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No tests completed yet. Start testing your knowledge!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
