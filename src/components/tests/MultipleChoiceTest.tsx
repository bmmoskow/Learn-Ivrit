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
    const correctAnswer = question.word.english_translation;
    const otherWords = allWords
      .filter(w => w && w.id && w.id !== question.word.id)
      .map(w => w.english_translation);

    const wrongAnswers = shuffleArray(otherWords).slice(0, 3);
    const allOptions = shuffleArray([correctAnswer, ...wrongAnswers]);

    setOptions(allOptions);
    setSelectedAnswer(null);
    setShowFeedback(false);
  }, [question, allWords]);

  const handleSelect = (answer: string) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const isCorrect = answer === question.word.english_translation;

    setTimeout(() => {
      onAnswer(answer, isCorrect);
    }, 1500);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="text-sm font-semibold text-green-600">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-12">
          <div className="text-center mb-8">
            <p className="text-gray-600 text-lg mb-4">Choose the correct translation:</p>
            <div className="text-5xl font-bold text-gray-900" dir="rtl">
              {question.word.hebrew_word}
            </div>
          </div>

          <div className="space-y-4">
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === question.word.english_translation;

              let buttonClass = 'w-full p-5 text-left text-lg rounded-xl border-2 transition ';

              if (showFeedback) {
                if (isCorrect) {
                  buttonClass += 'border-green-600 bg-green-50 text-green-900';
                } else if (isSelected && !isCorrect) {
                  buttonClass += 'border-red-600 bg-red-50 text-red-900';
                } else {
                  buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                }
              } else {
                buttonClass += 'border-gray-300 hover:border-green-500 hover:bg-green-50';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelect(option)}
                  disabled={showFeedback}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showFeedback && isCorrect && <Check className="w-6 h-6 text-green-600" />}
                    {showFeedback && isSelected && !isCorrect && <X className="w-6 h-6 text-red-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < questionNumber - 1
                    ? 'bg-green-600'
                    : i === questionNumber - 1
                    ? 'bg-green-400'
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
