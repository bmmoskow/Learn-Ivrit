import { useState, useEffect } from 'react';
import { X, Loader2, BookmarkPlus, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateBasicHebrewForms } from '../utils/hebrewForms';

type WordDefinitionPopupProps = {
  word: string;
  sentence: string;
  position: { x: number; y: number };
  onClose: () => void;
  onWordSaved: () => void;
};

type Example = {
  hebrew: string;
  english: string;
};

type Definition = {
  translation: string;
  definition: string;
  transliteration: string;
  wordWithVowels?: string;
  examples?: Example[];
  notes?: string;
  relatedWords?: RelatedWord[];
  shortEnglish?: string;
};

type RelatedWord = {
  hebrew: string;
  english: string;
  relationship: string;
};

export function WordDefinitionPopup({ word, sentence, position, onClose, onWordSaved }: WordDefinitionPopupProps) {
  const { user, isGuest } = useAuth();

  // Check if word contains foreign sound markers (letter + geresh anywhere in word)
  // These are: ג׳ ז׳ צ׳ ת׳ ד׳
  const hasForeignSounds = /[גזצתד]׳/.test(word);

  // Check if this is an acronym or contraction
  // Acronyms use ״ (gershayim) or " (regular double quote) between letters
  // Examples: רה"מ, צה"ל, ארה"ב
  const isAcronym = word.includes('״') || word.includes('"');

  // For foreign sounds, keep the word as-is; for acronyms, remove gershayim/quotes
  const normalizedWord = isAcronym && !hasForeignSounds
    ? word.replace(/[״"]/g, '').trim()
    : word.trim();


  const [currentWord, setCurrentWord] = useState(normalizedWord);
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);

  // Store the original flags so they persist even if currentWord changes
  const [originalIsAcronym] = useState(isAcronym);
  const [originalHasForeignSounds] = useState(hasForeignSounds);

  useEffect(() => {
    fetchDefinition();
    checkIfSaved();
  }, [currentWord, forceRefresh]);

  const checkIfSaved = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('vocabulary_words')
      .select('id')
      .eq('user_id', user.id)
      .eq('hebrew_word', currentWord)
      .maybeSingle();

    setSaved(!!data);
  };

  const fetchDefinition = async () => {
    setLoading(true);
    setError('');

    try {
      let data;
      let shortEnglish = 'No translation';

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const { data: cachedData } = await supabase
          .from('word_definitions')
          .select('*')
          .eq('word', currentWord)
          .maybeSingle();

        if (cachedData) {
          data = {
            wordWithVowels: cachedData.word_with_vowels,
            definition: cachedData.definition,
            transliteration: cachedData.transliteration,
            examples: cachedData.examples || [],
            notes: cachedData.notes || '',
            forms: cachedData.forms || [],
            shortEnglish: cachedData.short_english
          };
          shortEnglish = cachedData.short_english;
        }
      }

      // Fetch from API if not cached or forcing refresh
      if (!data) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/define`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word: currentWord,
            targetLanguage: 'Hebrew',
            isAcronym: originalIsAcronym,
            hasForeignSounds: originalHasForeignSounds
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch definition');
        }

        data = await response.json();

        console.log('API Response data:', JSON.stringify(data, null, 2));
        console.log('Definition field:', data.definition);
        console.log('Forms from API:', data.forms);

        // Use definition directly as the translation
        shortEnglish = data.definition && data.definition.trim() !== ''
          ? data.definition.trim()
          : 'Translation unavailable';

        // Limit length if needed
        if (shortEnglish.length > 40) {
          shortEnglish = shortEnglish.substring(0, 40).trim() + '...';
        }

        data.shortEnglish = shortEnglish;

        // Cache the result
        await supabase
          .from('word_definitions')
          .upsert({
            word: currentWord,
            word_with_vowels: data.wordWithVowels || currentWord,
            definition: data.definition || '',
            transliteration: data.transliteration || '',
            examples: data.examples || [],
            notes: data.notes || '',
            forms: data.forms || [],
            short_english: shortEnglish
          }, {
            onConflict: 'word'
          });

        // Reset forceRefresh flag after successful refresh
        if (forceRefresh) {
          setForceRefresh(false);
        }
      }

      let relatedWords = (data.forms || []).map((form: any) => ({
        hebrew: form.hebrew,
        english: form.transliteration,
        relationship: form.relationship
      }));

      if (relatedWords.length === 0) {
        console.log('No forms from API, generating basic forms');
        const basicForms = generateBasicHebrewForms(
          data.wordWithVowels || currentWord,
          data.transliteration || romanizeHebrew(currentWord)
        );
        relatedWords = basicForms;
      }

      console.log('Final related words:', relatedWords);

      setDefinition({
        translation: currentWord,
        definition: data.definition || 'No definition available',
        transliteration: data.transliteration || romanizeHebrew(currentWord),
        wordWithVowels: data.wordWithVowels || currentWord,
        examples: data.examples || [],
        notes: data.notes || '',
        relatedWords,
        shortEnglish
      });
    } catch (err) {
      setError('Failed to load definition');
      console.error('Definition error:', err);
    } finally {
      setLoading(false);
    }
  };

  const romanizeHebrew = (text: string): string => {
    const hebrewToRoman: { [key: string]: string } = {
      'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
      'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'ם': 'm',
      'מ': 'm', 'ן': 'n', 'נ': 'n', 'ס': 's', 'ע': '', 'פ': 'p', 'ף': 'f',
      'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
    };

    return text
      .split('')
      .map(char => hebrewToRoman[char] || char)
      .join('');
  };

  const saveToVocabulary = async () => {
    if (!user || !definition || saved) return;

    setSaving(true);
    setError('');

    try {
      const { data: wordData, error: insertError } = await supabase
        .from('vocabulary_words')
        .insert({
          user_id: user.id,
          hebrew_word: currentWord,
          english_translation: definition.shortEnglish || definition.definition.split('.')[0].trim(),
          definition: definition.definition,
          transliteration: definition.transliteration
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('word_statistics')
        .insert({
          user_id: user.id,
          word_id: wordData.id,
          correct_count: 0,
          incorrect_count: 0,
          total_attempts: 0,
          consecutive_correct: 0,
          confidence_score: 0
        });

      setSaved(true);
      onWordSaved();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('Word already in vocabulary');
        setSaved(true);
      } else {
        setError('Failed to save word');
        console.error('Save error:', err);
      }
    } finally {
      setSaving(false);
    }
  };

  const maxPopupHeight = window.innerHeight - 100;
  const popupStyle = {
    position: 'fixed' as const,
    left: `${Math.min(Math.max(position.x, 160), window.innerWidth - 160)}px`,
    top: `${Math.min(Math.max(position.y, 50), window.innerHeight - maxPopupHeight - 50)}px`,
    transform: 'translateX(-50%)',
    maxHeight: `${maxPopupHeight}px`,
    zIndex: 1000
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-[999]"
        onClick={onClose}
      />
      <div
        style={popupStyle}
        className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {definition && (
                <p className="text-blue-100 text-sm italic">
                  {definition.transliteration}
                </p>
              )}
              <h3 className="text-2xl font-bold" dir="rtl">
                {definition?.wordWithVowels || currentWord}
              </h3>
            </div>
            {definition && (
              <p className="text-white text-base font-medium mt-2">
                {definition.shortEnglish}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setForceRefresh(true)}
              disabled={loading}
              className="text-white hover:bg-blue-500 rounded-lg p-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh definition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-500 rounded-lg p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!loading && definition && definition.relatedWords && definition.relatedWords.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Related Words
            </p>
            <div className="space-y-1.5">
              {definition.relatedWords.map((relatedWord, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentWord(relatedWord.hebrew)}
                  className="w-full text-left p-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition group border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-base font-medium text-gray-900 group-hover:text-blue-700" dir="rtl">
                        {relatedWord.hebrew}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        {relatedWord.english}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {relatedWord.relationship}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}

        {error && !definition && !loading && (
          <div className="p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {definition && !loading && !isGuest && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={saveToVocabulary}
              disabled={saving || saved}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved to Vocabulary
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-5 h-5" />
                  Add to Vocabulary
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
