import { useState } from 'react';
import { Languages, Copy, X, Loader2, BookPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { WordDefinitionPopup } from './WordDefinitionPopup';

export function TranslationPanel() {
  const { user, isGuest } = useAuth();
  const [hebrewText, setHebrewText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    sentence: string;
    position: { x: number; y: number };
  } | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  const loadSavedWords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('vocabulary_words')
      .select('hebrew_word')
      .eq('user_id', user.id);

    if (!error && data) {
      setSavedWords(new Set(data.map(w => w.hebrew_word)));
    }
  };

  useState(() => {
    loadSavedWords();
  });

  const translateText = async () => {
    if (!hebrewText.trim()) return;

    setTranslating(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/translate`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: hebrewText,
          targetLanguage: 'English',
          sourceLanguage: 'Hebrew'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      setEnglishText(data.translation);
    } catch (err) {
      setError('Failed to translate. Please try again.');
      console.error('Translation error:', err);
    } finally {
      setTranslating(false);
    }
  };

  const cleanWord = (word: string): string => {
    let cleaned = word.trim();
    // Remove punctuation but preserve Hebrew marks: geresh (׳) and gershayim (״)
    cleaned = cleaned.replace(/[.,!?;:"'()\[\]{}،؛؟]/g, '');
    return cleaned;
  };

  const getSentenceContext = (text: string, targetWord: string): string => {
    const sentences = text.split(/[.!?؟،]+/);

    for (const sentence of sentences) {
      if (sentence.includes(targetWord)) {
        return sentence.trim();
      }
    }

    return text;
  };

  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    const word = (e.target as HTMLSpanElement).textContent || '';
    const cleanedWord = cleanWord(word);

    if (!cleanedWord) return;

    const rect = (e.target as HTMLSpanElement).getBoundingClientRect();
    const sentence = getSentenceContext(hebrewText, cleanedWord);

    setSelectedWord({
      word: cleanedWord,
      sentence: sentence,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + 5 }
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderHebrewWords = () => {
    if (!hebrewText) return null;

    const words = hebrewText.split(/(\s+)/);

    return (
      <div className="text-xl leading-relaxed" dir="rtl" lang="he">
        {words.map((word, index) => {
          const trimmedWord = word.trim();
          if (!trimmedWord) return <span key={index}>{word}</span>;

          const isSaved = savedWords.has(trimmedWord);

          return (
            <span
              key={index}
              onClick={handleWordClick}
              className={`cursor-pointer hover:bg-blue-100 px-0.5 rounded transition ${
                isSaved ? 'bg-green-50 border-b-2 border-green-400' : ''
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
      <div className="flex-1 bg-white rounded-xl shadow-lg p-6 flex flex-col order-1 lg:order-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Languages className="w-5 h-5 text-blue-600" />
            Hebrew Text
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(hebrewText)}
              disabled={!hebrewText}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy Hebrew text"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setHebrewText('');
                setEnglishText('');
              }}
              disabled={!hebrewText}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {hebrewText && !isGuest && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions and add them to your vocabulary list
            </p>
          </div>
        )}
        {hebrewText && isGuest && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions (sign in to save words)
            </p>
          </div>
        )}

        <div className="flex-1 min-h-[300px] border-2 border-gray-200 rounded-lg p-4 focus-within:border-blue-500 transition">
          {hebrewText ? (
            renderHebrewWords()
          ) : (
            <textarea
              value={hebrewText}
              onChange={(e) => setHebrewText(e.target.value)}
              placeholder="Paste Hebrew text here..."
              className="w-full h-full resize-none outline-none text-xl"
              dir="rtl"
              lang="he"
            />
          )}
        </div>

        {!hebrewText && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setHebrewText('שלום עולם')}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Try "שלום עולם"
            </button>
            <button
              onClick={() => setHebrewText('אני לומד עברית')}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Try "אני לומד עברית"
            </button>
          </div>
        )}

        <button
          onClick={translateText}
          disabled={!hebrewText.trim() || translating}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {translating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Languages className="w-5 h-5" />
              Translate to English
            </>
          )}
        </button>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-lg p-6 flex flex-col order-2 lg:order-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            English Translation
          </h2>
          <button
            onClick={() => handleCopy(englishText)}
            disabled={!englishText}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copy English text"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-[300px] border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
          {englishText ? (
            <p className="text-xl leading-relaxed text-gray-900">{englishText}</p>
          ) : (
            <p className="text-gray-400 text-center mt-20">
              Translation will appear here...
            </p>
          )}
        </div>
      </div>

      {selectedWord && (
        <WordDefinitionPopup
          word={selectedWord.word}
          sentence={selectedWord.sentence}
          position={selectedWord.position}
          onClose={() => setSelectedWord(null)}
          onWordSaved={loadSavedWords}
        />
      )}
    </div>
  );
}
