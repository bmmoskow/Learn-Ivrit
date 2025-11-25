import { useState, useEffect } from "react";
import { Languages, Copy, X, Loader2, BookPlus, Link as LinkIcon, ChevronLeft, ChevronRight, Book } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { WordDefinitionPopup } from "./WordDefinitionPopup";
import { BIBLE_BOOKS } from "../data/bibleBooks";

export function TranslationPanel() {
  const { user, isGuest } = useAuth();
  const [hebrewText, setHebrewText] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    sentence: string;
    position: { x: number; y: number };
  } | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [showBibleInput, setShowBibleInput] = useState(false);
  const [loadingBible, setLoadingBible] = useState(false);
  const [bibleLoaded, setBibleLoaded] = useState(false);
  const [currentBibleRef, setCurrentBibleRef] = useState<{ book: string; chapter: number } | null>(null);

  const loadSavedWords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("vocabulary_words")
      .select("hebrew_word")
      .eq("user_id", user.id);

    if (!error && data) {
      setSavedWords(new Set(data.map((w) => w.hebrew_word)));
    }
  };

  useState(() => {
    loadSavedWords();
  });

  useEffect(() => {
    if (hebrewText.trim() && !englishText) {
      translateText();
    } else if (!hebrewText.trim()) {
      setEnglishText("");
    }
  }, [hebrewText]);

  const loadFromUrl = async () => {
    if (!urlInput.trim()) return;

    setLoadingUrl(true);
    setError("");

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/extract-url`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: urlInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load URL");
      }

      const data = await response.json();
      console.log('Hebrew text loaded from URL, length:', data.content?.length);
      console.log('First 200 chars:', data.content?.substring(0, 200));
      console.log('Last 200 chars:', data.content?.substring(data.content?.length - 200));
      setHebrewText(data.content);
      setShowUrlInput(false);
      setUrlInput("");
      setBibleLoaded(false);
      setCurrentBibleRef(null);
    } catch (err) {
      setError("Failed to load content from URL. Please check the URL and try again.");
      console.error("URL extraction error:", err);
    } finally {
      setLoadingUrl(false);
    }
  };

  const stripHtml = (text: string): string => {
    // Create a temporary div to decode HTML entities
    const temp = document.createElement("div");
    temp.innerHTML = text;
    const decoded = temp.textContent || temp.innerText || "";

    // Remove any remaining HTML tags and control characters
    return decoded.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  };

  const removeTrope = (text: string): string => {
    // Remove Hebrew cantillation marks (trope/ta'amim)
    // Unicode ranges: U+0591-U+05AF, U+05BD, U+05BF, U+05C0, U+05C3-U+05C5
    return text.replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C5]/g, "");
  };

  const loadFromBible = async (book?: string, chapter?: number) => {
    const bookToLoad = book || selectedBook;
    const chapterToLoad = chapter || selectedChapter;

    if (!bookToLoad || !chapterToLoad) return;

    setLoadingBible(true);
    setError("");
    setEnglishText("");

    try {
      const reference = `${bookToLoad}.${chapterToLoad}`;

      let data = null;

      let cachedTranslation = null;

      if (!isGuest && user) {
        const { data: cachedData } = await supabase
          .from('sefaria_cache')
          .select('content, access_count, translation')
          .eq('reference', reference)
          .maybeSingle();

        if (cachedData) {
          data = cachedData.content;
          cachedTranslation = cachedData.translation;

          await supabase
            .from('sefaria_cache')
            .update({
              last_accessed: new Date().toISOString(),
              access_count: (cachedData.access_count || 0) + 1
            })
            .eq('reference', reference);
        }
      }

      if (!data) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sefaria-fetch?reference=${encodeURIComponent(reference)}`;

        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load Bible chapter");
        }

        data = await response.json();

        if (!isGuest && user) {
          await supabase
            .from('sefaria_cache')
            .insert({
              reference,
              content: data
            });
        }
      }

      const hebrewVerses = data.he || [];
      const versesWithNumbers = hebrewVerses.map((verse: string, index: number) => {
        const cleanVerse = removeTrope(stripHtml(verse));
        return `(${index + 1}) ${cleanVerse}`;
      });
      const hebrewText = versesWithNumbers.join("\n\n");

      setHebrewText(hebrewText);

      if (cachedTranslation) {
        setEnglishText(cachedTranslation);
      }

      setShowBibleInput(false);
      setBibleLoaded(true);
      setCurrentBibleRef({ book: bookToLoad, chapter: chapterToLoad });
    } catch (err) {
      setError("Failed to load Bible chapter. Please try again.");
      console.error("Bible loading error:", err);
    } finally {
      setLoadingBible(false);
    }
  };

  const navigateChapter = (direction: "prev" | "next") => {
    if (!currentBibleRef) return;

    const currentBook = BIBLE_BOOKS.find((b) => b.name === currentBibleRef.book);
    if (!currentBook) return;

    let newChapter = currentBibleRef.chapter;

    if (direction === "prev" && newChapter > 1) {
      newChapter--;
      loadFromBible(currentBibleRef.book, newChapter);
    } else if (direction === "next" && newChapter < currentBook.chapters) {
      newChapter++;
      loadFromBible(currentBibleRef.book, newChapter);
    }
  };

  const canNavigatePrev = () => {
    if (!currentBibleRef) return false;
    return currentBibleRef.chapter > 1;
  };

  const canNavigateNext = () => {
    if (!currentBibleRef) return false;
    const currentBook = BIBLE_BOOKS.find((b) => b.name === currentBibleRef.book);
    return currentBook ? currentBibleRef.chapter < currentBook.chapters : false;
  };

  const translateText = async () => {
    if (!hebrewText.trim()) return;

    setTranslating(true);
    setError("");

    try {
      const textToTranslate = hebrewText.trim();
      const textLength = textToTranslate.length;

      const encoder = new TextEncoder();
      const data = encoder.encode(textToTranslate);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (!isGuest && user) {
        console.log('Checking cache for content_hash:', contentHash);
        const { data: cachedData, error: cacheError } = await supabase
          .from('translation_cache')
          .select('translation, id')
          .eq('content_hash', contentHash)
          .maybeSingle();

        if (cacheError) {
          console.log('Cache lookup error:', cacheError);
        }

        if (!cacheError && cachedData) {
          console.log('✓ Translation found in cache, returning early');
          setEnglishText(cachedData.translation);

          await supabase.rpc('increment_translation_access', {
            cache_id: cachedData.id
          });

          setTranslating(false);
          return;
        } else {
          console.log('Cache miss - will call API');
        }
      }

      console.log('Calling Gemini API for translation');
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/translate`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToTranslate,
          targetLanguage: "English",
          sourceLanguage: "Hebrew",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Translation failed");
      }

      const responseData = await response.json();
      console.log('Translation received, length:', responseData.translation?.length);
      console.log('First 100 chars:', responseData.translation?.substring(0, 100));
      console.log('Last 100 chars:', responseData.translation?.substring(responseData.translation?.length - 100));
      setEnglishText(responseData.translation);

      if (!isGuest && user) {
        await supabase
          .from('translation_cache')
          .upsert({
            content_hash: contentHash,
            hebrew_text: textToTranslate,
            translation: responseData.translation,
            text_length: textLength,
            last_accessed: new Date().toISOString(),
            access_count: 1
          }, {
            onConflict: 'content_hash',
            ignoreDuplicates: true
          });
      }

      if (bibleLoaded && currentBibleRef && !isGuest && user) {
        const reference = `${currentBibleRef.book}.${currentBibleRef.chapter}`;
        await supabase
          .from('sefaria_cache')
          .update({ translation: responseData.translation })
          .eq('reference', reference);
      }
    } catch (err) {
      setError("Failed to translate. Please try again.");
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const cleanWord = (word: string): string => {
    let cleaned = word.trim();
    // Remove punctuation but preserve Hebrew marks: geresh (׳) and gershayim (״)
    cleaned = cleaned.replace(/[.,!?;:"'()\[\]{}،؛؟]/g, "");
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
    const word = (e.target as HTMLSpanElement).textContent || "";
    const cleanedWord = cleanWord(word);

    if (!cleanedWord) return;

    const rect = (e.target as HTMLSpanElement).getBoundingClientRect();
    const sentence = getSentenceContext(hebrewText, cleanedWord);

    setSelectedWord({
      word: cleanedWord,
      sentence: sentence,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + 5 },
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderSyncedText = () => {
    if (!hebrewText) return null;

    const hebrewParagraphs = hebrewText.split(/\n\n+/);
    const englishParagraphs = englishText ? englishText.split(/\n\n+/) : [];

    console.log('Hebrew paragraphs:', hebrewParagraphs.length);
    console.log('English paragraphs:', englishParagraphs.length);

    if (englishParagraphs.length > hebrewParagraphs.length) {
      const extraEnglish = englishParagraphs.slice(hebrewParagraphs.length).join('\n\n');
      if (hebrewParagraphs.length > 0 && extraEnglish.trim()) {
        englishParagraphs[hebrewParagraphs.length - 1] =
          englishParagraphs[hebrewParagraphs.length - 1] + '\n\n' + extraEnglish;
        englishParagraphs.length = hebrewParagraphs.length;
      }
    }

    return (
      <div className="space-y-6">
        {hebrewParagraphs.map((hebrewPara, paraIndex) => {
          const words = hebrewPara.split(/(\s+|\n)/);
          const englishPara = englishParagraphs[paraIndex] || "";

          return (
            <div key={paraIndex} className="grid grid-cols-2 gap-6">
              {/* Hebrew side */}
              <div className="text-xl leading-relaxed" dir="rtl" lang="he">
                <p className="whitespace-pre-wrap">
                  {words.map((word, index) => {
                    if (word === '\n') return <br key={index} />;

                    const trimmedWord = word.trim();
                    if (!trimmedWord) return <span key={index}>{word}</span>;

                    const isSaved = savedWords.has(trimmedWord);

                    return (
                      <span
                        key={index}
                        onClick={handleWordClick}
                        className={`cursor-pointer hover:bg-blue-100 px-0.5 rounded transition ${
                          isSaved ? "bg-green-50 border-b-2 border-green-400" : ""
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              </div>

              {/* English side */}
              <div className="text-xl leading-relaxed">
                <p className="whitespace-pre-wrap">
                  {translating ? (
                    <span className="text-gray-400">Translating...</span>
                  ) : englishPara ? (
                    englishPara
                  ) : (
                    <span className="text-gray-400">Translation will appear here...</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-600" />
              Translation Panel
            </h2>
          </div>
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
                setHebrewText("");
                setEnglishText("");
                setBibleLoaded(false);
                setCurrentBibleRef(null);
              }}
              disabled={!hebrewText}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {bibleLoaded && currentBibleRef && (
          <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-800">
                  {BIBLE_BOOKS.find((b) => b.name === currentBibleRef.book)?.hebrewName} {currentBibleRef.chapter} / {BIBLE_BOOKS.find((b) => b.name === currentBibleRef.book)?.name} {currentBibleRef.chapter}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateChapter("prev")}
                  disabled={!canNavigatePrev()}
                  className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous chapter"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateChapter("next")}
                  disabled={!canNavigateNext()}
                  className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next chapter"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {hebrewText && !isGuest && !bibleLoaded && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions and add them to your vocabulary list
            </p>
          </div>
        )}
        {hebrewText && isGuest && !bibleLoaded && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions (sign in to save words)
            </p>
          </div>
        )}

        <div className="flex-1 min-h-[500px] border-2 border-gray-200 rounded-lg p-4 focus-within:border-blue-500 transition">
          {hebrewText ? (
            renderSyncedText()
          ) : showBibleInput ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-full max-w-md space-y-3">
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Book</option>
                    {BIBLE_BOOKS.map((book) => (
                      <option key={book.name} value={book.name}>
                        {book.hebrewName} ({book.name})
                      </option>
                    ))}
                  </select>
                  {selectedBook && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={BIBLE_BOOKS.find((b) => b.name === selectedBook)?.chapters || 1}
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(Number(e.target.value))}
                        placeholder="Chapter"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => loadFromBible()}
                        disabled={!selectedBook || !selectedChapter || loadingBible}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingBible ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Book className="w-4 h-4" />
                            Load
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowBibleInput(false);
                    setSelectedBook("");
                    setSelectedChapter(1);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : showUrlInput ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-full max-w-md space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && loadFromUrl()}
                    placeholder="Enter URL (e.g., https://www.ynet.co.il/...)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
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
                    setUrlInput("");
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              <textarea
                value={hebrewText}
                onChange={(e) => setHebrewText(e.target.value)}
                placeholder=""
                className="w-full h-full resize-none outline-none text-xl"
                dir="rtl"
                lang="he"
              />
              <div className="absolute top-2 left-2 text-gray-400 pointer-events-none text-sm leading-relaxed">
                Paste Hebrew text here,{" "}
                <span
                  className="text-blue-600 underline cursor-pointer pointer-events-auto"
                  onClick={() => setShowUrlInput(true)}
                >
                  load from URL
                </span>
                , or{" "}
                <span
                  className="text-purple-600 underline cursor-pointer pointer-events-auto"
                  onClick={() => setShowBibleInput(true)}
                >
                  load from Bible
                </span>
              </div>
            </div>
          )}
        </div>

        {!hebrewText && !showUrlInput && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setHebrewText("שלום עולם")}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Try "שלום עולם"
              </button>
              <button
                onClick={() => setHebrewText("אני לומד עברית")}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Try "אני לומד עברית"
              </button>
            </div>
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
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}
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
