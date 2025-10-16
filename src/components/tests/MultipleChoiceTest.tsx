import { useState, useEffect } from 'react';
import { TestQuestion } from '../TestPanel';
import { WordWithStats, shuffleArray } from '../../utils/adaptiveAlgorithm';
import { Check, X } from 'lucide-react';

type MultipleChoiceTestProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  allWords: WordWithStats[];
  onAnswer: (answer: string, isCorrect: boolean) => void;
};

export function MultipleChoiceTest({
  question,
  questionNumber,
  totalQuestions,
  allWords,
  onAnswer
}: MultipleChoiceTestProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    generateOptions();
  }, [question]);

  const generateOptions = () => {
    const correctAnswer = question.word.english_translation;
    const otherWords = allWords
      .filter(w => w.id !== question.word.id)
      .map(w => w.english_translation);

    const wrongAnswers = shuffleArray(otherWords).slice(0, 3);
    const allOptions = shuffleArray([correctAnswer, ...wrongAnswers]);

    setOptions(allOptions);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handleSelect = (answer: string) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const isCorrect = answer === question.word.english_translation;

    setTimeout(() => {
      onAnswer(answer, isCorrect);
    }, 1500);
  };

  const getButtonClass = (option: string) => {
    const baseClass = 'w-full p-4 text-left rounded-xl font-medium transition text-lg border-2';

    if (!showFeedback) {
      return `${baseClass} border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50`;
    }

    if (option === question.word.english_translation) {
      return `${baseClass} border-green-500 bg-green-100 text-green-900`;
    }

    if (option === selectedAnswer) {
      return `${baseClass} border-red-500 bg-red-100 text-red-900`;
    }

    return `${baseClass} border-gray-300 bg-gray-100 text-gray-500 opacity-50`;
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-white">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">
            Question {questionNumber} of {totalQuestions}
          </div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <p className="text-sm font-semibold text-gray-500 uppercase mb-4 text-center">
            What is the English translation?
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
        </div>

        <div className="space-y-3">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={showFeedback}
              className={getButtonClass(option)}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {showFeedback && option === question.word.english_translation && (
                  <Check className="w-6 h-6 text-green-600" />
                )}
                {showFeedback && option === selectedAnswer && option !== question.word.english_translation && (
                  <X className="w-6 h-6 text-red-600" />
                )}
              </div>
            </button>
          ))}
        </div>

        {showFeedback && (
          <div className={`mt-6 p-4 rounded-lg ${
            selectedAnswer === question.word.english_translation
              ? 'bg-green-100 border border-green-200 text-green-800'
              : 'bg-red-100 border border-red-200 text-red-800'
          }`}>
            <p className="font-semibold">
              {selectedAnswer === question.word.english_translation
                ? 'Correct!'
                : `Incorrect. The correct answer is "${question.word.english_translation}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
