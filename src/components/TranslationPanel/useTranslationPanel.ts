import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import { BIBLE_BOOKS } from "../../data/bibleBooks";
import { requestDeduplicator, createRequestKey } from "../../utils/requestDeduplicator/requestDeduplicator";
import { Bookmark as BookmarkType } from "../../hooks/useBookmarks/useBookmarks";
import { getAuthHeader } from "../../utils/auth/getAuthHeader";
import { APP_CONFIG } from "../../config/app";
import {
  cleanWord,
  getSentenceContext,
  generateContentHash,
  syncParagraphs,
  formatBibleVerses,
  canNavigatePrev as utilCanNavigatePrev,
  canNavigateNext as utilCanNavigateNext,
  detectLanguage,
  SyncedParagraph,
  TranslationDirection,
} from "./translationPanelUtils";

export interface SelectedWord {
  word: string;
  sentence: string;
  position: { x: number; y: number };
}

export interface UseTranslationPanelReturn {
  // State
  hebrewText: string;
  englishText: string;
  sourceText: string;
  translatedText: string;
  translationDirection: TranslationDirection;
  translating: boolean;
  error: string;
  selectedWord: SelectedWord | null;
  savedWords: Set<string>;
  urlInput: string;
  showUrlInput: boolean;
  loadingUrl: boolean;
  selectedBook: string;
  selectedChapter: number;
  showBibleInput: boolean;
  loadingBible: boolean;
  bibleLoaded: boolean;
  currentBibleRef: { book: string; chapter: number } | null;
  processingImage: boolean;
  showBookmarkManager: boolean;
  showSaveBookmark: boolean;
  currentSource: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  syncedParagraphs: SyncedParagraph[] | null;

  // Setters
  setSourceText: (text: string) => void;
  setHebrewText: (text: string) => void;
  setUrlInput: (url: string) => void;
  setShowUrlInput: (show: boolean) => void;
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setShowBibleInput: (show: boolean) => void;
  setShowBookmarkManager: (show: boolean) => void;
  setShowSaveBookmark: (show: boolean) => void;
  setSelectedWord: (word: SelectedWord | null) => void;

  // Actions
  translateText: (text: string, direction: TranslationDirection) => Promise<void>;
  loadFromUrl: () => Promise<void>;
  loadFromBible: (book?: string, chapter?: number) => Promise<void>;
  navigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: () => boolean;
  canNavigateNext: () => boolean;
  handleWordClick: (e: React.MouseEvent<HTMLSpanElement>) => void;
  handleCopy: (text: string) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageUpload: (file: File) => Promise<void>;
  handleLoadBookmark: (bookmark: BookmarkType) => void;
  clearAll: () => void;
  loadSavedWords: () => Promise<void>;
  triggerFileInput: () => void;
}

export function useTranslationPanel(): UseTranslationPanelReturn {
  const { user, isGuest } = useAuth();
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translationDirection, setTranslationDirection] = useState<TranslationDirection>("hebrew-to-english");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
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
  const [processingImage, setProcessingImage] = useState(false);
  const [showBookmarkManager, setShowBookmarkManager] = useState(false);
  const [showSaveBookmark, setShowSaveBookmark] = useState(false);
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed: derive Hebrew/English based on direction
  const hebrewText = translationDirection === "hebrew-to-english" ? sourceText : translatedText;
  const englishText = translationDirection === "hebrew-to-english" ? translatedText : sourceText;

  /**
   * Centralized helper for importing Hebrew content from any source
   * (Bible, bookmarks, URL extraction, OCR, AI passages).
   * Handles: setting direction, updating source text, clearing translation, and triggering translation.
   */
  const importHebrewContent = useCallback((text: string, options?: {
    source?: string | null;
    cachedTranslation?: string | null;
    clearBibleState?: boolean;
  }) => {
    const { source = null, cachedTranslation = null, clearBibleState = true } = options || {};

    setTranslationDirection("hebrew-to-english");
    setSourceText(text);
    setCurrentSource(source);

    if (clearBibleState) {
      setBibleLoaded(false);
      setCurrentBibleRef(null);
    }

    if (cachedTranslation) {
      setTranslatedText(cachedTranslation);
    } else {
      setTranslatedText("");
      if (text.trim()) {
        translateText(text, "hebrew-to-english");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setter that maintains backward compatibility (for PassageGenerator)
  const setHebrewText = useCallback((text: string) => {
    importHebrewContent(text);
  }, [importHebrewContent]);

  const loadSavedWords = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase.from("vocabulary_words").select("hebrew_word").eq("user_id", user.id);

    if (!error && data) {
      setSavedWords(new Set(data.map((w) => w.hebrew_word)));
    }
  }, [user]);

  // Load saved words on mount
  useEffect(() => {
    loadSavedWords();
  }, [loadSavedWords]);

  // Handle source text changes - detect language and translate
  const handleSourceTextChange = useCallback((text: string) => {
    // Immediately update source text
    setSourceText(text);

    // Clear translation when source changes
    setTranslatedText("");

    if (text.trim()) {
      // Detect language and set direction
      const detectedDirection = detectLanguage(text);
      setTranslationDirection(detectedDirection);
      translateText(text, detectedDirection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the simpler effect for clearing only
  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText("");
    }
  }, [sourceText]);

  const loadFromUrl = async () => {
    if (!urlInput.trim()) return;

    setLoadingUrl(true);
    setError("");

    try {
      const url = urlInput.trim();
      const requestKey = createRequestKey("load-url", { url });

      const content = await requestDeduplicator.dedupe(requestKey, async () => {
        let content = null;

        if (!isGuest && user) {
          const { data: cachedData } = await supabase
            .from("sefaria_cache")
            .select("content, access_count")
            .eq("reference", url)
            .maybeSingle();

          if (cachedData) {
            console.log("URL content found in cache");
            content = cachedData.content;

            supabase
              .from("sefaria_cache")
              .update({
                last_accessed: new Date().toISOString(),
                access_count: (cachedData.access_count || 0) + 1,
              })
              .eq("reference", url)
              .then(() => {});
          }
        }

        if (!content) {
          console.log("Fetching URL content from API");

          const authHeader = await getAuthHeader();
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/extract-url`;

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load URL");
          }

          const data = await response.json();
          content = data.content;

          if (!isGuest && user) {
            supabase
              .from("sefaria_cache")
              .insert({
                reference: url,
                content,
                last_accessed: new Date().toISOString(),
                access_count: 1,
              })
              .then(() => {});
          }
        }

        return content;
      });

      const extractedText = typeof content === "string" ? content : "";
      console.log("Hebrew text loaded, length:", extractedText.length);

      importHebrewContent(extractedText, { source: url });
      setShowUrlInput(false);
      setUrlInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("403") || message.includes("Forbidden")) {
        setError("This website blocks automated text extraction. Try copying and pasting the article text manually using the \"Paste / Type\" option instead.");
      } else {
        setError(message || "Failed to load content from URL. Please check the URL and try again.");
      }
      console.error("URL extraction error:", err);
    } finally {
      setLoadingUrl(false);
    }
  };

  const loadFromBible = async (book?: string, chapter?: number) => {
    const bookToLoad = book || selectedBook;
    const chapterToLoad = chapter || selectedChapter;

    if (!bookToLoad || !chapterToLoad) return;

    setLoadingBible(true);
    setError("");
    setTranslatedText("");

    try {
      const reference = `${bookToLoad}.${chapterToLoad}`;
      const requestKey = createRequestKey("load-bible", { reference });

      const { data, cachedTranslation } = await requestDeduplicator.dedupe(requestKey, async () => {
        let data = null;
        let cachedTranslation = null;

        if (!isGuest && user) {
          const { data: cachedData } = await supabase
            .from("sefaria_cache")
            .select("content, access_count, translation")
            .eq("reference", reference)
            .maybeSingle();

          if (cachedData) {
            data = cachedData.content;
            cachedTranslation = cachedData.translation;

            supabase
              .from("sefaria_cache")
              .update({
                last_accessed: new Date().toISOString(),
                access_count: (cachedData.access_count || 0) + 1,
              })
              .eq("reference", reference)
              .then(() => {});
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
            supabase
              .from("sefaria_cache")
              .insert({
                reference,
                content: data,
              })
              .then(() => {});
          }
        }

        return { data, cachedTranslation };
      });

      const hebrewVerses = data.he || [];
      const formattedHebrewText = formatBibleVerses(hebrewVerses);

      importHebrewContent(formattedHebrewText, {
        source: `${bookToLoad} ${chapterToLoad}`,
        cachedTranslation,
        clearBibleState: false
      });
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

  const canNavigatePrev = () => utilCanNavigatePrev(currentBibleRef);
  const canNavigateNext = () => utilCanNavigateNext(currentBibleRef, BIBLE_BOOKS);

  /**
   * Translate a single chunk of text via cache or edge function.
   * Returns the translated text for that chunk.
   */
  const translateChunk = async (
    chunkText: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> => {
    const cacheKey = `${sourceLanguage}->${targetLanguage}:${chunkText}`;
    const contentHash = await generateContentHash(cacheKey);
    const requestKey = createRequestKey("translate", { contentHash });

    return requestDeduplicator.dedupe(requestKey, async () => {
      // Check frontend cache first
      const { data: cached } = await supabase
        .from("translation_cache")
        .select("id, translation")
        .eq("content_hash", contentHash)
        .maybeSingle();

      if (cached?.translation) {
        console.log("Cache hit for chunk hash:", contentHash);
        supabase.rpc("increment_translation_access", { cache_id: cached.id }).then();
        // Log cache hit to api_usage_logs
         (supabase as any).from("api_usage_logs").insert({
           user_id: user?.id || "guest-user",
           request_type: "translate",
           endpoint: "/translate",
           prompt_tokens: 0,
           candidates_tokens: 0,
           thinking_tokens: 0,
           cache_hit: true,
           model: "cache",
         }).then();
        return cached.translation;
      }

      console.log("Cache miss, translating chunk, hash:", contentHash);
      const authHeader = await getAuthHeader();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/translate`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: chunkText, targetLanguage, sourceLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(errorData.error || "Rate limit exceeded. Please try again later.");
        }
        throw new Error(errorData.error || "Translation failed");
      }

      const data = await response.json();
      // Collapse any \n\n inside a single chunk's translation to \n
      // to preserve 1:1 paragraph alignment with source text
      const raw = data.translation || "";
      return raw.replace(/\n\n+/g, "\n");
    });
  };

  /**
   * Check the per-article rate limit before translating.
   * Returns true if allowed, false if rate-limited (sets error message).
   */
  const checkArticleRateLimit = async (): Promise<boolean> => {
    if (!user || isGuest) return true; // Guests use anon key limits

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const { data: hourlyData, error: hourlyErr } = await supabase
      .from("gemini_api_rate_limits")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("request_type", "passage_translation")
      .gte("created_at", oneHourAgo.toISOString())
      .order("created_at", { ascending: true });

    if (!hourlyErr && hourlyData) {
      const hourlyLimit = APP_CONFIG.translationHourlyLimit ?? 30;
      if (hourlyData.length >= hourlyLimit) {
        const oldest = new Date(hourlyData[0].created_at);
        const resetTime = new Date(oldest.getTime() + 60 * 60 * 1000);
        const minutesLeft = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 1000));
        setError(`You've reached the hourly translation limit (${hourlyLimit} articles/hour). Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`);
        return false;
      }
    }

    // Check daily limit
    const { data: dailyData, error: dailyErr } = await supabase
      .from("gemini_api_rate_limits")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("request_type", "passage_translation")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: true });

    if (!dailyErr && dailyData) {
      const dailyLimit = APP_CONFIG.translationDailyLimit ?? 100;
      if (dailyData.length >= dailyLimit) {
        const oldest = new Date(dailyData[0].created_at);
        const resetTime = new Date(oldest.getTime() + 24 * 60 * 60 * 1000);
        const hoursLeft = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 60 * 1000));
        setError(`You've reached the daily translation limit (${dailyLimit} articles/day). Please try again in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}.`);
        return false;
      }
    }

    return true;
  };

  /**
   * Log one rate-limit entry per article translation.
   */
  const logArticleTranslation = async () => {
    if (!user || isGuest) return;
    await supabase.from("gemini_api_rate_limits").insert({
      user_id: user.id,
      request_type: "passage_translation",
    });
  };

  const translateText = async (text?: string, direction?: TranslationDirection) => {
    const textToTranslate = (text || sourceText).trim();
    const currentDirection = direction || translationDirection;

    if (!textToTranslate) return;

    const sourceLanguage = currentDirection === "hebrew-to-english" ? "Hebrew" : "English";
    const targetLanguage = currentDirection === "hebrew-to-english" ? "English" : "Hebrew";

    setTranslating(true);
    setError("");

    // Per-article rate limit check (one check per translateText call)
    const allowed = await checkArticleRateLimit();
    if (!allowed) {
      setTranslating(false);
      return;
    }

    try {
      // Split by paragraph for 1:1 alignment with source text
      const paragraphs = textToTranslate.split(/\n\n+/);
      console.log(`Translating ${sourceLanguage}->${targetLanguage}: ${paragraphs.length} paragraph(s)`);

      const maxConcurrency = APP_CONFIG.translationMaxConcurrency;
      const results: string[] = new Array(paragraphs.length).fill("");
      let contiguousResolved = 0;

      // Progressive rendering: update translatedText as contiguous paragraphs resolve
      const updateContiguous = () => {
        while (contiguousResolved < paragraphs.length && results[contiguousResolved] !== "") {
          contiguousResolved++;
        }
        // Join all resolved contiguous paragraphs; pad remaining with empty strings
        // so syncParagraphs sees the right paragraph count
        const visibleResults = results.slice(0, contiguousResolved);
        const remaining = paragraphs.length - contiguousResolved;
        const fullResult = [...visibleResults, ...new Array(remaining).fill("")].join("\n\n");
        setTranslatedText(fullResult);
      };

      if (paragraphs.length === 1) {
        const translation = await translateChunk(paragraphs[0], sourceLanguage, targetLanguage);
        results[0] = translation;
        setTranslatedText(translation);
      } else {
        // Concurrency pool with progressive in-order rendering
        let active = 0;
        let nextIndex = 0;

        await new Promise<void>((resolve, reject) => {
          let completed = 0;

          const launchNext = () => {
            while (active < maxConcurrency && nextIndex < paragraphs.length) {
              const i = nextIndex++;
              active++;
              translateChunk(paragraphs[i], sourceLanguage, targetLanguage)
                .then((result) => {
                  results[i] = result;
                  active--;
                  completed++;
                  updateContiguous();
                  if (completed === paragraphs.length) {
                    resolve();
                  } else {
                    launchNext();
                  }
                })
                .catch(reject);
            }
          };

          launchNext();
        });

        const fullTranslation = results.join("\n\n");
        setTranslatedText(fullTranslation);
        console.log("All paragraphs translated, total length:", fullTranslation.length);
      }

      // Log one rate-limit entry for the entire article
      logArticleTranslation();

      // Cache Bible translations to Sefaria cache
      if (bibleLoaded && currentBibleRef && !isGuest && user && currentDirection === "hebrew-to-english") {
        const reference = `${currentBibleRef.book}.${currentBibleRef.chapter}`;
        const fullTranslation = results.join("\n\n");
        supabase
          .from("sefaria_cache")
          .update({ translation: fullTranslation })
          .eq("reference", reference)
          .then(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to translate. Please try again.");
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
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

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    setProcessingImage(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const base64Data = reader.result as string;

      console.log("Sending image for OCR...");

      const authHeader = await getAuthHeader();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/ocr`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: base64Data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(errorData.error || "Rate limit exceeded. Please try again later.");
        }
        throw new Error(errorData.error || "Failed to extract text from image");
      }

      const data = await response.json();
      console.log("OCR completed, text length:", data.hebrewText?.length);

      importHebrewContent(data.hebrewText || "", { source: "Image OCR" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image. Please try again.");
      console.error("Image OCR error:", err);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleLoadBookmark = (bookmark: BookmarkType) => {
    importHebrewContent(bookmark.hebrew_text, { source: bookmark.source });
    setShowBookmarkManager(false);
  };

  const clearAll = () => {
    setSourceText("");
    setTranslatedText("");
    setTranslationDirection("hebrew-to-english");
    setBibleLoaded(false);
    setCurrentBibleRef(null);
    setCurrentSource(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const syncedParagraphs = useMemo(() => syncParagraphs(hebrewText, englishText), [hebrewText, englishText]);

  return {
    // State
    hebrewText,
    englishText,
    sourceText,
    translatedText,
    translationDirection,
    translating,
    error,
    selectedWord,
    savedWords,
    urlInput,
    showUrlInput,
    loadingUrl,
    selectedBook,
    selectedChapter,
    showBibleInput,
    loadingBible,
    bibleLoaded,
    currentBibleRef,
    processingImage,
    showBookmarkManager,
    showSaveBookmark,
    currentSource,
    fileInputRef,
    syncedParagraphs,

    // Setters
    setSourceText: handleSourceTextChange,
    setHebrewText,
    setUrlInput,
    setShowUrlInput,
    setSelectedBook,
    setSelectedChapter,
    setShowBibleInput,
    setShowBookmarkManager,
    setShowSaveBookmark,
    setSelectedWord,

    // Actions
    translateText,
    loadFromUrl,
    loadFromBible,
    navigateChapter,
    canNavigatePrev,
    canNavigateNext,
    handleWordClick,
    handleCopy,
    handleFileSelect,
    handleImageUpload,
    handleLoadBookmark,
    clearAll,
    loadSavedWords,
    triggerFileInput,
  };
}
