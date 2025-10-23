import { useState, useEffect } from 'react';
import { Languages, Copy, X, Loader2, BookPlus, Link as LinkIcon } from 'lucide-react';
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
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);

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

  useEffect(() => {
    if (hebrewText.trim()) {
      translateText();
    } else {
      setEnglishText('');
    }
  }, [hebrewText]);

  const loadFromUrl = async () => {
    if (!urlInput.trim()) return;

    setLoadingUrl(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/extract-url`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load URL');
      }

      const data = await response.json();
      setHebrewText(data.content);
      setShowUrlInput(false);
      setUrlInput('');
    } catch (err) {
      setError('Failed to load content from URL. Please check the URL and try again.');
      console.error('URL extraction error:', err);
    } finally {
      setLoadingUrl(false);
    }
  };

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

    const paragraphs = hebrewText.split(/\n\n+/);

    return (
      <div className="text-xl leading-relaxed space-y-4" dir="rtl" lang="he">
        {paragraphs.map((paragraph, paraIndex) => {
          const lines = paragraph.split('\n');

          return (
            <p key={paraIndex} className="whitespace-pre-wrap">
              {lines.map((line, lineIndex) => {
                const words = line.split(/(\s+)/);

                return (
                  <span key={lineIndex}>
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
                    {lineIndex < lines.length - 1 && <br />}
                  </span>
                );
              })}
            </p>
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

        {!hebrewText && !showUrlInput && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
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
            <div className="text-center">
              <span className="text-gray-400 text-sm">or</span>
            </div>
            <button
              onClick={() => setShowUrlInput(true)}
              className="w-full px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2 border border-blue-200"
            >
              <LinkIcon className="w-4 h-4" />
              Load from URL
            </button>
          </div>
        )}

        {showUrlInput && !hebrewText && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadFromUrl()}
                placeholder="Enter URL (e.g., https://www.ynet.co.il/...)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={loadFromUrl}
                disabled={!urlInput.trim() || loadingUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Load
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => {
                setShowUrlInput(false);
                setUrlInput('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}

        {translating && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Translating...
            </p>
          </div>
        )}

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
