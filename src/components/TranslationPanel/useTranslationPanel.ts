import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import { BIBLE_BOOKS } from "../../data/bibleBooks";
import { requestDeduplicator, createRequestKey } from "../../utils/requestDeduplicator/requestDeduplicator";
import { Bookmark as BookmarkType } from "../../hooks/useBookmarks/useBookmarks";
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

  // Setter that maintains backward compatibility
  const setHebrewText = useCallback((text: string) => {
    // When setting Hebrew text directly (e.g., from Bible), force Hebrew→English direction
    setTranslationDirection("hebrew-to-english");
    setSourceText(text);
  }, []);

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
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/extract-url`;

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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

      console.log("Hebrew text loaded, length:", content?.length);
      setHebrewText(content);
      setShowUrlInput(false);
      setUrlInput("");
      setBibleLoaded(false);
      setCurrentBibleRef(null);
      setCurrentSource(url);
    } catch (err) {
      setError("Failed to load content from URL. Please check the URL and try again.");
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

      // Set state directly (not via setHebrewText to avoid re-detecting direction)
      setTranslationDirection("hebrew-to-english");
      setSourceText(formattedHebrewText);

      if (cachedTranslation) {
        setTranslatedText(cachedTranslation);
      } else if (formattedHebrewText.trim()) {
        // No cached translation - trigger translation
        translateText(formattedHebrewText, "hebrew-to-english");
      }

      setShowBibleInput(false);
      setBibleLoaded(true);
      setCurrentBibleRef({ book: bookToLoad, chapter: chapterToLoad });
      setCurrentSource(`${bookToLoad} ${chapterToLoad}`);
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

  const translateText = async (text?: string, direction?: TranslationDirection) => {
    const textToTranslate = (text || sourceText).trim();
    const currentDirection = direction || translationDirection;

    if (!textToTranslate) return;

    const sourceLanguage = currentDirection === "hebrew-to-english" ? "Hebrew" : "English";
    const targetLanguage = currentDirection === "hebrew-to-english" ? "English" : "Hebrew";

    setTranslating(true);
    setError("");

    try {
      // Include direction in cache key
      const cacheKey = `${sourceLanguage}->${targetLanguage}:${textToTranslate}`;
      const contentHash = await generateContentHash(cacheKey);

      console.log(`Translating ${sourceLanguage} to ${targetLanguage}, hash:`, contentHash);

      const requestKey = createRequestKey("translate", { contentHash });

      const translation = await requestDeduplicator.dedupe(requestKey, async () => {
        // Check frontend cache first (faster than edge function round-trip)
        const { data: cached } = await supabase
          .from("translation_cache")
          .select("id, translation")
          .eq("content_hash", contentHash)
          .maybeSingle();

        if (cached?.translation) {
          console.log("Frontend cache hit for hash:", contentHash);
          supabase.rpc("increment_translation_access", { cache_id: cached.id }).then();
          return cached.translation;
        }

        console.log("Cache miss, calling edge function for translation");
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/translate`;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("You must be logged in to translate");
        }

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToTranslate,
            targetLanguage,
            sourceLanguage,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 429) {
            throw new Error(errorData.error || "Rate limit exceeded. Please try again later.");
          }
          throw new Error(errorData.error || "Translation failed");
        }

        const responseData = await response.json();
        console.log("Translation received, length:", responseData.translation?.length);

        // Cache Bible translations to Sefaria cache
        if (bibleLoaded && currentBibleRef && !isGuest && user && currentDirection === "hebrew-to-english") {
          const reference = `${currentBibleRef.book}.${currentBibleRef.chapter}`;
          supabase
            .from("sefaria_cache")
            .update({ translation: responseData.translation })
            .eq("reference", reference)
            .then(() => {});
        }

        return responseData.translation;
      });

      setTranslatedText(translation);
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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to use image OCR");
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-translate/ocr`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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

      // OCR always returns Hebrew
      setTranslationDirection("hebrew-to-english");
      setSourceText(data.hebrewText || "");
      setTranslatedText("");

      if ((data.hebrewText || "").trim()) {
        translateText(data.hebrewText, "hebrew-to-english");
      }

      setBibleLoaded(false);
      setCurrentBibleRef(null);
      setCurrentSource("Image OCR");
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
    // Force Hebrew→English direction for bookmarks (they store Hebrew text)
    setTranslationDirection("hebrew-to-english");
    setSourceText(bookmark.hebrew_text);
    setTranslatedText("");
    setCurrentSource(bookmark.source);
    setBibleLoaded(false);
    setCurrentBibleRef(null);
    setShowBookmarkManager(false);

    // Trigger translation
    if (bookmark.hebrew_text.trim()) {
      translateText(bookmark.hebrew_text, "hebrew-to-english");
    }
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
    handleLoadBookmark,
    clearAll,
    loadSavedWords,
    triggerFileInput,
  };
}
