import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, VocabularyWord, WordStatistics } from '../lib/supabase';
import { selectTestWords, calculateConfidenceScore, shuffleArray, WordWithStats } from '../utils/adaptiveAlgorithm';
import { FlashcardTest } from './tests/FlashcardTest';
import { MultipleChoiceTest } from './tests/MultipleChoiceTest';
import { FillInBlankTest } from './tests/FillInBlankTest';
import { TestResults } from './tests/TestResults';
import { BookOpen, Loader2 } from 'lucide-react';
import { defaultVocabulary } from '../data/defaultVocabulary';

export type TestType = 'flashcard' | 'multiple_choice' | 'fill_in_blank';

export type TestQuestion = {
  word: WordWithStats;
  userAnswer?: string;
  isCorrect?: boolean;
  responseTime?: number;
};

export function TestPanel() {
  const { user, isGuest } = useAuth();
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [testType, setTestType] = useState<TestType | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [currentTest, setCurrentTest] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);

  useEffect(() => {
    loadVocabulary();
  }, [user, isGuest]);

  const loadVocabulary = async () => {
    if (isGuest) {
      const guestWords: WordWithStats[] = defaultVocabulary.map((word, index) => ({
        id: `guest-${index}`,
        user_id: 'guest',
        hebrew_word: word.hebrew,
        english_translation: word.english,
        definition: word.english,
        transliteration: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        statistics: {
          id: `guest-stats-${index}`,
          user_id: 'guest',
          word_id: `guest-${index}`,
          correct_count: 0,
          incorrect_count: 0,
          total_attempts: 0,
          consecutive_correct: 0,
          confidence_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }));
      setWords(guestWords);
      setLoading(false);
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      const { data: vocabData, error: vocabError } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('user_id', user.id);

      if (vocabError) throw vocabError;

      const { data: statsData, error: statsError } = await supabase
        .from('word_statistics')
        .select('*')
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      const wordsWithStats = vocabData.map(word => {
        const stats = statsData.find(s => s.word_id === word.id);
        return { ...word, statistics: stats };
      });

      setWords(wordsWithStats);
    } catch (err) {
      console.error('Error loading vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  const startTest = (type: TestType) => {
    if (words.length === 0) return;

    const count = Math.min(questionCount, words.length);
    const selectedWords = selectTestWords(words, count);
    const questions: TestQuestion[] = selectedWords.map(word => ({ word }));

    setTestType(type);
    setCurrentTest(questions);
    setCurrentQuestionIndex(0);
    setTestStartTime(Date.now());
    setQuestionStartTime(Date.now());
    setShowResults(false);
  };

  const handleAnswer = (answer: string, isCorrect: boolean) => {
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);

    const updatedQuestions = [...currentTest];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      userAnswer: answer,
      isCorrect,
      responseTime
    };

    setCurrentTest(updatedQuestions);

    if (currentQuestionIndex < currentTest.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      finishTest(updatedQuestions);
    }
  };

  const finishTest = async (completedTest: TestQuestion[]) => {
    const minDisplayTime = new Promise(resolve => setTimeout(resolve, 2000));

    if (isGuest) {
      await minDisplayTime;
      setShowResults(true);
      return;
    }

    if (!user) return;

    const correctCount = completedTest.filter(q => q.isCorrect).length;
    const totalQuestions = completedTest.length;
    const scorePercentage = (correctCount / totalQuestions) * 100;
    const durationSeconds = Math.floor((Date.now() - testStartTime) / 1000);

    try {
      const saveData = async () => {
        const { data: testData, error: testError } = await supabase
          .from('user_tests')
          .insert({
            user_id: user.id,
            test_type: testType!,
            total_questions: totalQuestions,
            correct_answers: correctCount,
            score_percentage: scorePercentage,
            duration_seconds: durationSeconds
          })
          .select()
          .single();

        if (testError) throw testError;

        setTestId(testData.id);

        for (const question of completedTest) {
          await supabase
            .from('test_responses')
            .insert({
              test_id: testData.id,
              user_id: user.id,
              word_id: question.word.id,
              user_answer: question.userAnswer || '',
              correct_answer: question.word.english_translation,
              is_correct: question.isCorrect || false,
              response_time_seconds: question.responseTime
            });

          const stats = question.word.statistics;
          const newCorrectCount = (stats?.correct_count || 0) + (question.isCorrect ? 1 : 0);
          const newIncorrectCount = (stats?.incorrect_count || 0) + (question.isCorrect ? 0 : 1);
          const newTotalAttempts = (stats?.total_attempts || 0) + 1;
          const newConsecutiveCorrect = question.isCorrect
            ? (stats?.consecutive_correct || 0) + 1
            : 0;

          const newConfidenceScore = calculateConfidenceScore({
            correct_count: newCorrectCount,
            incorrect_count: newIncorrectCount,
            total_attempts: newTotalAttempts,
            consecutive_correct: newConsecutiveCorrect
          });

          await supabase
            .from('word_statistics')
            .upsert({
              user_id: user.id,
              word_id: question.word.id,
              correct_count: newCorrectCount,
              incorrect_count: newIncorrectCount,
              total_attempts: newTotalAttempts,
              consecutive_correct: newConsecutiveCorrect,
              last_tested: new Date().toISOString(),
              confidence_score: newConfidenceScore
            }, {
              onConflict: 'user_id,word_id'
            });
        }
      };

      await Promise.all([minDisplayTime, saveData()]);
      setShowResults(true);
    } catch (err) {
      console.error('Error saving test results:', err);
    }
  };

  const resetTest = () => {
    setTestType(null);
    setCurrentTest([]);
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setTestId(null);
    loadVocabulary();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Vocabulary Words Yet</h2>
          <p className="text-gray-600">
            Add some words to your vocabulary list before taking a test. Start by translating Hebrew text!
          </p>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <TestResults
        test={currentTest}
        testType={testType!}
        onRetakeTest={() => startTest(testType!)}
        onNewTest={resetTest}
      />
    );
  }

  if (testType && currentTest.length > 0) {
    const currentQuestion = currentTest[currentQuestionIndex];

    if (testType === 'flashcard') {
      return (
        <FlashcardTest
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={currentTest.length}
          onAnswer={handleAnswer}
        />
      );
    }

    if (testType === 'multiple_choice') {
      return (
        <MultipleChoiceTest
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={currentTest.length}
          allWords={words}
          onAnswer={handleAnswer}
        />
      );
    }

    if (testType === 'fill_in_blank') {
      return (
        <FillInBlankTest
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={currentTest.length}
          onAnswer={handleAnswer}
        />
      );
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Your Knowledge</h2>
          <p className="text-gray-600 mb-8">
            Choose a test format and challenge yourself with {words.length} words in your vocabulary
          </p>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Questions
            </label>
            <input
              type="range"
              min="5"
              max={Math.min(50, words.length)}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>5</span>
              <span className="font-semibold text-blue-600">{questionCount} questions</span>
              <span>{Math.min(50, words.length)}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => startTest('flashcard')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">🎴</div>
              <h3 className="text-xl font-bold mb-2">Flashcards</h3>
              <p className="text-blue-100 text-sm">
                See Hebrew words and guess the English translation
              </p>
            </button>

            <button
              onClick={() => startTest('multiple_choice')}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-xl font-bold mb-2">Multiple Choice</h3>
              <p className="text-green-100 text-sm">
                Choose the correct translation from options
              </p>
            </button>

            <button
              onClick={() => startTest('fill_in_blank')}
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">✍️</div>
              <h3 className="text-xl font-bold mb-2">Fill in the Blank</h3>
              <p className="text-orange-100 text-sm">
                Type the English translation yourself
              </p>
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Adaptive Learning:</strong> The test will focus more on words you struggle with and less on words you've mastered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
